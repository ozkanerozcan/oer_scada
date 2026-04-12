const ModbusRTU = require('modbus-serial');

const clients = new Map();    // deviceId -> ModbusRTU client
const activeIntervals = new Map(); // deviceId -> setInterval handle

// ─── Register size per dataType ────────────────────────────────────────────────
function getRegisterSize(dataType) {
  if (!dataType) return 1;
  const dt = dataType.toLowerCase();
  if (dt === 'int32' || dt === 'uint32' || dt === 'float32') return 2;
  return 1; // Int16, UInt16, Bool
}

// ─── Parse buffer chunk into a value for a given dataType ─────────────────────
function parseBufferValue(buffer, dataType, bitOffset = 0) {
  try {
    const dt = (dataType || '').toLowerCase();
    if (dt === 'float32') return buffer.readFloatBE(0);
    if (dt === 'int32')   return buffer.readInt32BE(0);
    if (dt === 'uint32')  return buffer.readUInt32BE(0);
    if (dt === 'uint16')  return buffer.readUInt16BE(0);
    if (dt === 'bool') {
      const bit = bitOffset || 0;
      const byteIndex = Math.floor(bit / 8);
      const bitIndex = bit % 8;
      return (buffer[byteIndex] >> bitIndex) & 1;
    }
    return buffer.readInt16BE(0); // Int16 default
  } catch {
    return null;
  }
}

// ─── Is an error a TCP/socket-level connection failure? ───────────────────────
// These errors mean the underlying socket is dead, not just a bad register.
function isConnectionError(err) {
  return /ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTCONN|EPIPE|socket hang up|closed|not open/i
    .test(err.message || '');
}

// ─── Build polling blocks for a device ────────────────────────────────────────
function buildPollingBlocks(db, deviceId) {
  const groups = db.prepare(`
    SELECT g.* FROM tag_groups g
    JOIN device_group_assignments dga ON g.id = dga.groupId
    WHERE dga.deviceId = ?
    ORDER BY g.id
  `).all(deviceId);

  const blocks = [];
  for (const group of groups) {
    const tags = db.prepare('SELECT * FROM tags WHERE groupId=? ORDER BY sortOrder').all(group.id);
    if (tags.length === 0) continue;

    let offset = 0;
    let boolSlotOffset = null;
    let boolSlotUsed = 0;

    const tagMeta = tags.map(tag => {
      if (tag.dataType === 'Bool') {
        if (boolSlotOffset === null || boolSlotUsed >= 16) {
          boolSlotOffset = offset;
          boolSlotUsed = 0;
          offset += 1;
        }
        const currentBit = tag.bitOffset ?? boolSlotUsed;
        boolSlotUsed++;
        return { ...tag, registerOffset: boolSlotOffset, regSize: 1, bitPosition: currentBit };
      } else {
        boolSlotOffset = null;
        boolSlotUsed = 0;
        const regSize = getRegisterSize(tag.dataType);
        const meta = { ...tag, registerOffset: offset, regSize };
        offset += regSize;
        return meta;
      }
    });

    const totalRegisters = offset;
    if (totalRegisters === 0) continue;
    if (totalRegisters > 125) {
      console.warn(`[Modbus] Group "${group.name}" exceeds 125 registers (${totalRegisters}). Clamped.`);
    }

    blocks.push({
      group,
      tags: tagMeta,
      startAddress: group.startAddress,
      totalRegisters: Math.min(totalRegisters, 125),
      readInterval: group.readInterval || 1000,
      lastPoll: 0,
    });
  }
  return blocks;
}

// ─── Start polling all enabled devices ────────────────────────────────────────
async function startDevicePolling(fastify, specificId = null) {
  const db = require('../database/db');
  let devices;
  if (specificId) {
    devices = db.prepare("SELECT * FROM devices WHERE id = ? AND enabled = 1 AND type = 'Modbus TCP'").all(specificId);
  } else {
    devices = db.prepare("SELECT * FROM devices WHERE enabled = 1 AND type = 'Modbus TCP'").all();
  }

  for (const device of devices) {
    try {
      const blocks = buildPollingBlocks(db, device.id);
      if (blocks.length === 0) {
        console.log(`[Modbus] Device "${device.name}" has no group assignments. Skipping.`);
        continue;
      }

      // ── WebSocket status helper ─────────────────────────────────────────────
      const broadcastStatus = (status) => {
        const msg = JSON.stringify({ type: 'device:status', payload: { deviceId: device.id, status } });
        fastify.websocketServer.clients.forEach(ws => {
          if (ws.readyState === 1) ws.send(msg);
        });
      };

      // ── Client factory ──────────────────────────────────────────────────────
      // Always creates a brand-new ModbusRTU instance on (re)connect.
      // Reusing the same client after a TCP drop is unreliable — the internal
      // socket can be in an inconsistent state that connectTCP alone doesn't fix.
      const createClient = () => new Promise((resolve, reject) => {
        const c = new ModbusRTU();
        c.on('error', (err) => {
          console.error(`[Modbus] Socket error on "${device.name}":`, err.message);
        });
        const timer = setTimeout(() => reject(new Error('Connection timeout')), 5000);
        c.connectTCP(device.ip, { port: device.port || 502 })
          .then(() => {
            clearTimeout(timer);
            c.setID(device.slaveId || 1);
            c.setTimeout(3000);
            resolve(c);
          })
          .catch((err) => {
            clearTimeout(timer);
            reject(err);
          });
      });

      // Initial connection
      let client = await createClient();
      clients.set(device.id, client);
      console.log(`[Modbus] Connected to "${device.name}" at ${device.ip}:${device.port}`);
      console.log(`[Modbus] "${device.name}" has ${blocks.length} group(s) to poll`);

      let isPolling        = false;
      let isConnected      = true;   // our own reliable connection flag
      let isDeviceOnline   = false;
      let consecutiveFailures = 0;
      let reconnectTimer   = null;   // prevents stacking reconnect attempts

      // ── Reconnect scheduler ─────────────────────────────────────────────────
      // Runs outside the polling interval to avoid blocking it.
      // Uses exponential backoff and always creates a fresh client instance.
      const scheduleReconnect = (delayMs = 2000) => {
        if (reconnectTimer) return; // already scheduled
        reconnectTimer = setTimeout(async () => {
          reconnectTimer = null;
          try { client.close(); } catch {} // close old socket first
          try {
            console.log(`[Modbus] Reconnecting to "${device.name}" (${device.ip})...`);
            client = await createClient();
            clients.set(device.id, client);
            isConnected = true;
            consecutiveFailures = 0;
            blocks.forEach(b => { b.lastPoll = 0; }); // poll immediately on reconnect
            console.log(`[Modbus] Reconnected to "${device.name}" successfully.`);
          } catch (err) {
            console.error(`[Modbus] Reconnection failed for "${device.name}": ${err.message}. Retrying...`);
            isConnected = false;
            scheduleReconnect(Math.min(delayMs * 2, 30000)); // exponential backoff, max 30s
          }
        }, delayMs);
      };

      // ── Polling interval (100 ms tick, each block respects its readInterval) ─
      const interval = setInterval(async () => {
        if (isPolling) return;
        isPolling = true;

        // If socket is known dead, wait for scheduleReconnect to fix it
        if (!isConnected) {
          isPolling = false;
          return;
        }

        const now = Date.now();
        const payload = {};
        let blocksPolledThisTick = 0;
        let connectionLost = false;

        for (const block of blocks) {
          if (now - block.lastPoll < block.readInterval) continue;
          block.lastPoll = now;
          blocksPolledThisTick++;

          const regCache = new Map();

          for (const tag of block.tags) {
            if (connectionLost) break; // abort remaining tags if socket died
            try {
              const absAddr = block.startAddress + tag.registerOffset;

              if (!regCache.has(absAddr)) {
                try {
                  const data = await client.readHoldingRegisters(absAddr, tag.regSize);
                  regCache.set(absAddr, data.buffer);
                } catch (readErr) {
                  if (isConnectionError(readErr)) {
                    // TCP socket is dead — stop all reads and schedule reconnect
                    console.warn(`[Modbus] Connection lost on "${device.name}": ${readErr.message}`);
                    connectionLost = true;
                    isConnected = false;
                    break;
                  }
                  // Non-fatal (unsupported register, bad address, etc.) — skip tag only
                  console.warn(`[Modbus] "${device.name}" reg ${absAddr} (tag "${tag.name}") skipped: ${readErr.message}`);
                  regCache.set(absAddr, null);
                  continue;
                }
              }

              const buf = regCache.get(absAddr);
              if (!buf) continue;

              const val = parseBufferValue(buf, tag.dataType, tag.bitOffset ?? tag.bitPosition);
              const key = `${device.name}.${block.group.name}.${tag.name}`;
              payload[key] = val;
            } catch (tagErr) {
              console.error(`[Modbus] "${device.name}" tag "${tag.name}" error:`, tagErr.message);
            }
          }

          if (connectionLost) break; // abort remaining blocks
        }

        // ── Health evaluation ─────────────────────────────────────────────────
        if (connectionLost) {
          // Socket died mid-tick — go offline and start reconnect process
          consecutiveFailures++;
          if (isDeviceOnline) {
            isDeviceOnline = false;
            broadcastStatus('disconnected');
            console.log(`[Modbus] Device "${device.name}" is OFFLINE`);
          }
          scheduleReconnect(2000);
        } else if (blocksPolledThisTick > 0) {
          if (Object.keys(payload).length > 0) {
            // Successful reads — broadcast data and mark online
            const message = JSON.stringify({ type: 'DATA_UPDATE', deviceId: device.id, payload });
            fastify.websocketServer.clients.forEach(ws => {
              if (ws.readyState === 1) ws.send(message);
            });
            consecutiveFailures = 0;
            if (!isDeviceOnline) {
              isDeviceOnline = true;
              broadcastStatus('connected');
              console.log(`[Modbus] Device "${device.name}" is ONLINE`);
            }
          } else {
            // Blocks were due but all reads produced nothing (non-fatal errors)
            consecutiveFailures++;
            if (isDeviceOnline && consecutiveFailures >= 3) {
              isDeviceOnline = false;
              broadcastStatus('disconnected');
              console.log(`[Modbus] Device "${device.name}" is OFFLINE (${consecutiveFailures} empty polls)`);
            }
          }
        }

        isPolling = false;
      }, 100);

      activeIntervals.set(device.id, interval);

    } catch (err) {
      console.error(`[Modbus] Failed to connect to "${device.name}":`, err.message);
      // Notify frontend immediately so it doesn't stay stuck on "Connecting…"
      try {
        const msg = JSON.stringify({ type: 'device:status', payload: { deviceId: device.id, status: 'disconnected' } });
        fastify.websocketServer.clients.forEach(ws => {
          if (ws.readyState === 1) ws.send(msg);
        });
      } catch {}
    }
  }
}

// ─── Stop & Restart ───────────────────────────────────────────────────────────
function stopAllPolling() {
  for (const [id, interval] of activeIntervals) {
    clearInterval(interval);
  }
  activeIntervals.clear();

  for (const [id, client] of clients) {
    try { client.close(); } catch {}
  }
  clients.clear();
}

function restartPolling(fastify, deviceId = null) {
  if (deviceId) {
    console.log(`[Modbus] Surgical restart for device ID: ${deviceId}`);
    const interval = activeIntervals.get(Number(deviceId));
    if (interval) clearInterval(interval);
    activeIntervals.delete(Number(deviceId));

    const client = clients.get(Number(deviceId));
    if (client) {
      try { client.close(); } catch {}
    }
    clients.delete(Number(deviceId));

    // Small delay to ensure port is closed before re-opening
    setTimeout(() => startDevicePolling(fastify, Number(deviceId)), 200);
  } else {
    console.log('[Modbus] Global restart sequence initiated...');
    stopAllPolling();
    setTimeout(() => startDevicePolling(fastify), 500);
  }
}

module.exports = { startDevicePolling, stopAllPolling, restartPolling };
