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

// ─── Build polling blocks for a device ────────────────────────────────────────
// Returns array of blocks ready for readHoldingRegisters
function buildPollingBlocks(db, deviceId) {
  // Get all groups assigned to this device, with their ordered tags
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

    // Accumulate register offsets sequentially with bit-packing
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

    const totalRegisters = offset; // Final cursor position
    if (totalRegisters === 0) continue;
    if (totalRegisters > 125) {
      console.warn(`[Modbus] Group "${group.name}" (id=${group.id}) exceeds 125 registers (${totalRegisters}). Clamped.`);
    }

    blocks.push({
      group,
      tags: tagMeta,
      startAddress: group.startAddress,
      totalRegisters: Math.min(totalRegisters, 125),
      readInterval: group.readInterval || 1000,
      lastPoll: 0
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

      const client = new ModbusRTU();
      
      // Prevent unhandled socket errors (e.g. ECONNRESET) from crashing Node
      client.on('error', (err) => {
        console.error(`[Modbus] Socket error on "${device.name}":`, err.message);
      });

      // Connection timeout wrapper
      const connectWithTimeout = (ip, options) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Connection timeout'));
          }, 5000);
          client.connectTCP(ip, options)
            .then(() => {
              clearTimeout(timeout);
              resolve();
            })
            .catch((err) => {
              clearTimeout(timeout);
              reject(err);
            });
        });
      };

      await connectWithTimeout(device.ip, { port: device.port || 502 });
      client.setID(device.slaveId || 1);
      client.setTimeout(3000);
      clients.set(device.id, client);
      console.log(`[Modbus] Connected to "${device.name}" at ${device.ip}:${device.port}`);
      console.log(`[Modbus] "${device.name}" has ${blocks.length} group(s) to poll`);

      let isPolling = false;
      let lastSuccessfulPoll = 0;
      let isDeviceOnline = false;
      const interval = setInterval(async () => {
        if (isPolling) return;
        isPolling = true;

        const now = Date.now();
        const payload = {};

        // Automatic reconnect if port was closed
        if (!client.isOpen) {
          try {
            console.log(`[Modbus] Port closed. Attempting to reconnect to "${device.name}" (${device.ip})...`);
            await client.connectTCP(device.ip, { port: device.port || 502 });
            client.setID(device.slaveId || 1);
            console.log(`[Modbus] Reconnected to "${device.name}" successfully.`);
          } catch (err) {
            console.error(`[Modbus] Reconnection failed for "${device.name}":`, err.message);
            isPolling = false;
            return;
          }
        }

        for (const block of blocks) {
          if (now - block.lastPoll < block.readInterval) continue;
          block.lastPoll = now;

          // Memoize reads: key = absolute register address, value = Buffer (2 bytes per reg)
          const regCache = new Map();

          for (const tag of block.tags) {
            try {
              const absAddr = block.startAddress + tag.registerOffset;

              // Read from cache or fetch from PLC
              if (!regCache.has(absAddr)) {
                try {
                  const data = await client.readHoldingRegisters(absAddr, tag.regSize);
                  regCache.set(absAddr, data.buffer);
                } catch (readErr) {
                  // This specific register is not supported — skip tag, but continue with others
                  console.warn(`[Modbus] "${device.name}" reg ${absAddr} (tag "${tag.name}") skipped: ${readErr.message}`);
                  regCache.set(absAddr, null); // mark as failed so we don't retry this cycle
                  continue;
                }
              }

              const buf = regCache.get(absAddr);
              if (!buf) continue; // previously failed this cycle

              const val = parseBufferValue(buf, tag.dataType, tag.bitOffset ?? tag.bitPosition);
              const key = `${device.name}.${block.group.name}.${tag.name}`;
              payload[key] = val;
            } catch (tagErr) {
              console.error(`[Modbus] "${device.name}" tag "${tag.name}" error:`, tagErr.message);
            }
          }
        }

        if (Object.keys(payload).length > 0) {
          const message = JSON.stringify({ type: 'DATA_UPDATE', deviceId: device.id, payload });
          fastify.websocketServer.clients.forEach(ws => {
            if (ws.readyState === 1) ws.send(message);
          });
        }

        lastSuccessfulPoll = now;

        // Send device:status when coming back online
        if (!isDeviceOnline) {
          isDeviceOnline = true;
          const statusMessage = JSON.stringify({ type: 'device:status', deviceId: device.id, status: 'connected' });
          fastify.websocketServer.clients.forEach(ws => {
            if (ws.readyState === 1) ws.send(statusMessage);
          });
          console.log(`[Modbus] Device "${device.name}" is ONLINE`);
        }

        // Check if device is offline (no successful polls for 3 seconds)
        if (isDeviceOnline && (now - lastSuccessfulPoll) > 3000) {
          isDeviceOnline = false;
          const statusMessage = JSON.stringify({ type: 'device:status', deviceId: device.id, status: 'disconnected' });
          fastify.websocketServer.clients.forEach(ws => {
            if (ws.readyState === 1) ws.send(statusMessage);
          });
          console.log(`[Modbus] Device "${device.name}" is OFFLINE`);
        }

        isPolling = false;
      }, 100); // Engine ticks every 100ms, each block respects its own readInterval

      activeIntervals.set(device.id, interval);

    } catch (err) {
      console.error(`[Modbus] Failed to connect to "${device.name}":`, err.message);
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
