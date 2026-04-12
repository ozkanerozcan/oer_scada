const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const jwt = require('@fastify/jwt');
const websocket = require('@fastify/websocket');
const ModbusRTU = require("modbus-serial");
require('dotenv').config();

const db = require('./database/db');
const ModbusService = require('./services/modbusService');

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason?.message || reason);
});

fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
fastify.register(jwt, { secret: process.env.JWT_SECRET || 'supersecret' });
fastify.register(websocket);

// ─── Auth ─────────────────────────────────────────────────────────────────────
fastify.post('/api/auth/login', async (request, reply) => {
  const { username, password } = request.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
  if (!user) return reply.code(401).send({ error: 'Invalid credentials' });
  const token = fastify.jwt.sign({ id: user.id, username: user.username, role: user.role });
  return { token, user: { id: user.id, username: user.username, role: user.role } };
});

// ─── Devices ──────────────────────────────────────────────────────────────────
fastify.get('/api/devices', async () => db.prepare('SELECT d.*, dga.groupId as variableGroupId FROM devices d LEFT JOIN device_group_assignments dga ON d.id = dga.deviceId').all());

fastify.post('/api/devices', async (request) => {
  const { name, ip, port = 502, slaveId = 1, type = 'Modbus TCP', enabled = 1 } = request.body;
  const variableGroupId = request.body.variableGroupId ? Number(request.body.variableGroupId) : null;
  const info = db.prepare('INSERT INTO devices (name, ip, port, slaveId, type, enabled) VALUES (?, ?, ?, ?, ?, ?)').run(name, ip, port, slaveId, type, enabled);
  const deviceId = info.lastInsertRowid;
  if (variableGroupId) {
    db.prepare('INSERT INTO device_group_assignments (deviceId, groupId) VALUES (?, ?)').run(Number(deviceId), Number(variableGroupId));
  }
  ModbusService.restartPolling(fastify, deviceId);
  return { success: true, id: deviceId };
});

fastify.put('/api/devices/:id', async (request) => {
  const id = Number(request.params.id);
  const { name, ip, port, slaveId, type, enabled } = request.body;
  const variableGroupId = request.body.variableGroupId ? Number(request.body.variableGroupId) : null;
  db.prepare('UPDATE devices SET name=?, ip=?, port=?, slaveId=?, type=?, enabled=? WHERE id=?').run(name, ip, port, slaveId, type, enabled, id);
  db.prepare('DELETE FROM device_group_assignments WHERE deviceId=?').run(id);
  if (variableGroupId) {
    db.prepare('INSERT INTO device_group_assignments (deviceId, groupId) VALUES (?, ?)').run(id, variableGroupId);
  }
  ModbusService.restartPolling(fastify, id);
  return { success: true };
});

fastify.delete('/api/devices/:id', async (request) => {
  const { id } = request.params;
  db.prepare('DELETE FROM devices WHERE id=?').run(id);
  ModbusService.restartPolling(fastify);
  return { success: true };
});

// ─── Tag Groups ───────────────────────────────────────────────────────────────
fastify.get('/api/groups', async () => {
  const groups = db.prepare('SELECT * FROM tag_groups ORDER BY id').all();
  return groups.map(g => {
    const tags = db.prepare('SELECT * FROM tags WHERE groupId=? ORDER BY sortOrder').all(g.id);
    const assignedDevices = db.prepare(`
      SELECT d.id, d.name FROM devices d
      JOIN device_group_assignments dga ON d.id = dga.deviceId
      WHERE dga.groupId = ?
    `).all(g.id);
    // Calculate total register usage by simulating the bit-packing layout
    let cursor = 0;
    let boolSlotOffset = null;
    let boolSlotUsed = 0;
    for (const t of tags) {
      if (t.dataType === 'Bool') {
        if (boolSlotOffset === null || boolSlotUsed >= 16) {
          boolSlotOffset = cursor;
          boolSlotUsed = 0;
          cursor += 1;
        }
        boolSlotUsed++;
      } else {
        boolSlotOffset = null;
        boolSlotUsed = 0;
        cursor += getRegisterSize(t.dataType);
      }
    }
    const totalRegisters = cursor;
    return { ...g, tags, assignedDevices, totalRegisters };
  });
});

fastify.post('/api/groups', async (request) => {
  const { name, startAddress = 0, readInterval = 1000, description = '' } = request.body;
  const info = db.prepare('INSERT INTO tag_groups (name, startAddress, readInterval, description) VALUES (?, ?, ?, ?)').run(name, startAddress, readInterval, description);
  return { success: true, id: info.lastInsertRowid };
});

fastify.put('/api/groups/:id', async (request) => {
  const { id } = request.params;
  const { name, startAddress, readInterval, description } = request.body;
  db.prepare('UPDATE tag_groups SET name=?, startAddress=?, readInterval=?, description=? WHERE id=?').run(name, startAddress, readInterval, description, id);
  ModbusService.restartPolling(fastify);
  return { success: true };
});

fastify.delete('/api/groups/:id', async (request) => {
  const { id } = request.params;
  db.prepare('DELETE FROM tag_groups WHERE id=?').run(id);
  ModbusService.restartPolling(fastify);
  return { success: true };
});

// ─── Device ↔ Group Assignments ───────────────────────────────────────────────
fastify.post('/api/groups/:groupId/devices', async (request, reply) => {
  const { groupId } = request.params;
  const { deviceId } = request.body;
  try {
    db.prepare('DELETE FROM device_group_assignments WHERE deviceId=?').run(Number(deviceId));
    db.prepare('INSERT INTO device_group_assignments (deviceId, groupId) VALUES (?, ?)').run(Number(deviceId), Number(groupId));
    ModbusService.restartPolling(fastify);
    return { success: true };
  } catch (e) {
    return reply.code(400).send({ success: false, error: e.message });
  }
});

fastify.delete('/api/groups/:groupId/devices/:deviceId', async (request) => {
  const { groupId, deviceId } = request.params;
  db.prepare('DELETE FROM device_group_assignments WHERE groupId=? AND deviceId=?').run(Number(groupId), Number(deviceId));
  ModbusService.restartPolling(fastify);
  return { success: true };
});

// ─── Tags (Variables within a Group) ─────────────────────────────────────────

function repackGroupTags(groupId) {
  const tags = db.prepare('SELECT * FROM tags WHERE groupId=? ORDER BY sortOrder').all(groupId);
  let cursor = 0;
  let boolSlotOffset = null;
  let boolSlotUsed = 0;

  const updateBitOffset = db.prepare('UPDATE tags SET bitOffset=? WHERE id=?');
  const updateTx = db.transaction((updates) => {
    for (const u of updates) updateBitOffset.run(u.bitOffset, u.id);
  });

  const updates = [];

  for (const t of tags) {
    if (t.dataType === 'Bool') {
      if (boolSlotOffset === null || boolSlotUsed >= 16) {
        boolSlotOffset = cursor;
        boolSlotUsed = 0;
        cursor += 1;
      }
      if (t.bitOffset !== boolSlotUsed) {
        updates.push({ id: t.id, bitOffset: boolSlotUsed });
      }
      boolSlotUsed++;
    } else {
      boolSlotOffset = null;
      boolSlotUsed = 0;
      cursor += getRegisterSize(t.dataType);
    }
  }

  if (updates.length > 0) {
    updateTx(updates);
  }
}

fastify.post('/api/tags', async (request, reply) => {
  const { groupId, name, dataType = 'Int16', unit = '' } = request.body;
  try {
    const gid = Number(groupId);

    // ── Check 125-register limit ──────────────────────────────────────────────
    // Fetch existing and simulate the addition
    const existing = db.prepare('SELECT * FROM tags WHERE groupId=? ORDER BY sortOrder').all(gid);
    let cursor = 0;
    let boolSlotOffset = null;
    let boolSlotUsed = 0;

    for (const t of existing) {
      if (t.dataType === 'Bool') {
        if (boolSlotOffset === null || boolSlotUsed >= 16) {
          boolSlotOffset = cursor;
          boolSlotUsed = 0;
          cursor += 1;
        }
        boolSlotUsed++;
      } else {
        boolSlotOffset = null;
        boolSlotUsed = 0;
        cursor += getRegisterSize(t.dataType);
      }
    }

    let extraRegisters = getRegisterSize(dataType);
    if (dataType === 'Bool') {
      if (boolSlotOffset !== null && boolSlotUsed < 16) extraRegisters = 0;
      else extraRegisters = 1;
    }

    if (cursor + extraRegisters > 125) {
      return reply.code(400).send({ success: false, error: 'Group exceeds 125 register limit' });
    }

    const maxOrder = db.prepare('SELECT MAX(sortOrder) as m FROM tags WHERE groupId=?').get(gid);
    const sortOrder = (maxOrder?.m ?? -1) + 1;

    const info = db.prepare(
      'INSERT INTO tags (groupId, name, dataType, bitOffset, unit, sortOrder) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(gid, name, dataType, 0, unit, sortOrder);

    repackGroupTags(gid); // auto-assigns correct bitOffsets
    ModbusService.restartPolling(fastify);
    reply.send({ success: true, id: info.lastInsertRowid });
  } catch (e) {
    reply.code(400).send({ success: false, error: e.message });
  }
});

fastify.put('/api/tags/:id', async (request, reply) => {
  const { id } = request.params;
  const { name, dataType, unit } = request.body; // Remove bitOffset from payload
  try {
    db.prepare('UPDATE tags SET name=?, dataType=?, unit=? WHERE id=?').run(name, dataType, unit, id);
    const tag = db.prepare('SELECT groupId FROM tags WHERE id=?').get(id);
    if (tag) repackGroupTags(tag.groupId);

    ModbusService.restartPolling(fastify);
    reply.send({ success: true });
  } catch (e) {
    reply.code(400).send({ success: false, error: e.message });
  }
});

fastify.delete('/api/tags/:id', async (request) => {
  const { id } = request.params;
  const tag = db.prepare('SELECT groupId FROM tags WHERE id=?').get(id);
  db.prepare('DELETE FROM tags WHERE id=?').run(id);

  if (tag) repackGroupTags(tag.groupId);
  ModbusService.restartPolling(fastify);
  return { success: true };
});

// Reorder tags within a group (array of {id, sortOrder})
fastify.post('/api/tags/reorder', async (request) => {
  const { items } = request.body; // [{ id, sortOrder }]

  if (items.length > 0) {
    const updateStmt = db.prepare('UPDATE tags SET sortOrder=? WHERE id=?');
    const reorderMany = db.transaction((items) => {
      for (const item of items) {
        updateStmt.run(item.sortOrder, item.id);
      }
    });
    reorderMany(items);

    const sampleTag = db.prepare('SELECT groupId FROM tags WHERE id=?').get(items[0].id);
    if (sampleTag) repackGroupTags(sampleTag.groupId);
  }

  ModbusService.restartPolling(fastify);
  return { success: true };
});

// ─── Dashboards ───────────────────────────────────────────────────────────────
fastify.get('/api/dashboards', async () => {
  const rows = db.prepare('SELECT * FROM dashboards').all();
  return rows.map(r => ({
    ...r,
    isVisible: Boolean(r.isVisible),
    widgets: r.widgets ? JSON.parse(r.widgets) : []
  }));
});

fastify.post('/api/dashboards', async (request) => {
  const { id, name, description = '', isVisible = false, widgets = [], createdAt, updatedAt } = request.body;
  db.prepare('INSERT INTO dashboards (id, name, description, isVisible, widgets, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, name, description, isVisible ? 1 : 0, JSON.stringify(widgets), createdAt, updatedAt
  );
  return { success: true, id };
});

fastify.put('/api/dashboards/:id', async (request) => {
  const { id } = request.params;
  const { name, description, isVisible, widgets, updatedAt } = request.body;
  
  // Update fields dynamically, as put requests might only update metadata or widgets
  let query = 'UPDATE dashboards SET ';
  const params = [];
  
  if (name !== undefined) { query += 'name=?, '; params.push(name); }
  if (description !== undefined) { query += 'description=?, '; params.push(description); }
  if (isVisible !== undefined) { query += 'isVisible=?, '; params.push(isVisible ? 1 : 0); }
  if (widgets !== undefined) { query += 'widgets=?, '; params.push(JSON.stringify(widgets)); }
  if (updatedAt !== undefined) { query += 'updatedAt=?, '; params.push(updatedAt); }
  
  // Remove trailing comma and space
  query = query.slice(0, -2);
  query += ' WHERE id=?';
  params.push(id);
  
  db.prepare(query).run(...params);
  return { success: true };
});

fastify.delete('/api/dashboards/:id', async (request) => {
  const { id } = request.params;
  db.prepare('DELETE FROM dashboards WHERE id=?').run(id);
  return { success: true };
});

// ─── Watch Table ──────────────────────────────────────────────────────────────
fastify.get('/api/watch', async () => db.prepare('SELECT * FROM watch_items ORDER BY sortOrder, id').all());

fastify.post('/api/watch', async (request) => {
  const { tagKey } = request.body;
  const max = db.prepare('SELECT MAX(sortOrder) as m FROM watch_items').get();
  const info = db.prepare('INSERT OR IGNORE INTO watch_items (tagKey, sortOrder) VALUES (?, ?)').run(tagKey, (max?.m || 0) + 1);
  return { success: true, id: info.lastInsertRowid };
});

fastify.delete('/api/watch/:id', async (request) => {
  db.prepare('DELETE FROM watch_items WHERE id=?').run(request.params.id);
  return { success: true };
});

fastify.post('/api/watch/reorder', async (request) => {
  const { items } = request.body;
  const updateStmt = db.prepare('UPDATE watch_items SET sortOrder=? WHERE id=?');
  const reorderMany = db.transaction((items) => items.forEach(i => updateStmt.run(i.sortOrder, i.id)));
  reorderMany(items);
  return { success: true };
});

// ─── WebSocket ────────────────────────────────────────────────────────────────
fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    connection.on('message', msg => console.log('WS:', msg.toString()));
  });
});

// ─── Ping ─────────────────────────────────────────────────────────────────────
fastify.post('/api/devices/ping', async (request, reply) => {
  const { ip, port = 502 } = request.body;
  const net = require('net');
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2500);
    socket.on('connect', () => { socket.destroy(); resolve({ success: true, message: `Connected to ${ip}:${port}` }); });
    socket.on('timeout', () => { socket.destroy(); resolve(reply.code(400).send({ success: false, error: 'Connection timeout' })); });
    socket.on('error', (err) => { socket.destroy(); resolve(reply.code(400).send({ success: false, error: err.message })); });
    socket.connect(port, ip);
  });
});

// ─── Modbus Direct Read/Write ─────────────────────────────────────────────────
fastify.post('/api/modbus/direct', async (request, reply) => {
  const { ip, port = 502, unitId = 1, address = 0, type = 'Int', operation = 'Read', value, bitOffset } = request.body;
  const client = new ModbusRTU();
  client.on('error', err => console.error('[Modbus Direct Error]', err.message));
  try {
    await client.connectTCP(ip, { port });
    client.setID(unitId);
    client.setTimeout(2000);
    let resultData = null;
    if (operation === 'Read') {
      if (type === 'Bool') {
        if (bitOffset !== undefined) {
          const r = await client.readHoldingRegisters(address, 1);
          const buf = Buffer.alloc(2);
          buf.writeUInt16BE(r.data[0]);
          const byteIndex = Math.floor(bitOffset / 8);
          const bitIndex = bitOffset % 8;
          resultData = Boolean((buf[byteIndex] >> bitIndex) & 1);
        } else {
          const r = await client.readCoils(address, 1);
          resultData = r.data[0];
        }
      }
      else if (type === 'Int') { const r = await client.readHoldingRegisters(address, 1); resultData = r.data[0]; }
      else if (type === 'Real') { const r = await client.readHoldingRegisters(address, 2); resultData = r.buffer.readFloatBE(0); }
    } else {
      if (type === 'Bool') {
        if (bitOffset !== undefined) {
          // Read-Modify-Write holding register using Buffer
          const r = await client.readHoldingRegisters(address, 1);
          const buf = Buffer.alloc(2);
          buf.writeUInt16BE(r.data[0]);
          const byteIndex = Math.floor(bitOffset / 8);
          const bitIndex = bitOffset % 8;
          
          if (Boolean(value)) buf[byteIndex] |= (1 << bitIndex);
          else buf[byteIndex] &= ~(1 << bitIndex);
          
          await client.writeRegister(address, buf.readUInt16BE(0));
          resultData = Boolean(value);
        } else {
          await client.writeCoil(address, Boolean(value)); 
          resultData = Boolean(value);
        }
      }
      else if (type === 'Int') { await client.writeRegister(address, parseInt(value)); resultData = parseInt(value); }
      else if (type === 'Real') {
        const b = Buffer.alloc(4); b.writeFloatBE(parseFloat(value), 0);
        await client.writeRegisters(address, [b.readUInt16BE(0), b.readUInt16BE(2)]);
        resultData = parseFloat(value);
      }
    }
    client.close();
    return { success: true, operation, value: resultData };
  } catch (err) {
    if (client.isOpen) client.close();
    return reply.code(400).send({ success: false, error: err.message });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRegisterSize(dataType) {
  if (!dataType) return 1;
  const dt = dataType.toLowerCase();
  if (dt === 'int32' || dt === 'uint32' || dt === 'float32') return 2;
  return 1; // bool, int16, uint16
}

// ─── Start ────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Fastify server is running on http://0.0.0.0:3000');
    ModbusService.startDevicePolling(fastify);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
