const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../data/scada.db');
const db = new Database(dbPath, { verbose: console.log });

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

// ─── Migration guard: if tags table has old 'deviceId' column, drop and recreate ─
try {
  const cols = db.prepare("PRAGMA table_info(tags)").all();
  if (cols.length > 0 && cols.some(c => c.name === 'deviceId')) {
    console.log('[DB] Detected old tags schema — migrating to new poll group schema...');
    db.exec('DROP TABLE IF EXISTS tags;');
    console.log('[DB] Old tags table dropped. New schema will be created.');
  }
} catch(e) { /* table doesn't exist yet, no action needed */ }
// ─── Migration guard: if devices table is missing 'type', add it ──────────
try {
  const cols = db.prepare("PRAGMA table_info(devices)").all();
  if (cols.length > 0 && !cols.some(c => c.name === 'type')) {
    console.log('[DB] Detected missing type in devices table — migrating...');
    db.exec("ALTER TABLE devices ADD COLUMN type TEXT NOT NULL DEFAULT 'Modbus TCP';");
    console.log('[DB] Devices table migrated to include type.');
  }
  // OPC UA fields
  if (cols.length > 0 && !cols.some(c => c.name === 'opcuaEndpoint')) {
    db.exec("ALTER TABLE devices ADD COLUMN opcuaEndpoint TEXT DEFAULT '';");
    db.exec("ALTER TABLE devices ADD COLUMN opcuaSecurityMode TEXT DEFAULT 'None';");
    db.exec("ALTER TABLE devices ADD COLUMN opcuaUsername TEXT DEFAULT '';");
    db.exec("ALTER TABLE devices ADD COLUMN opcuaPassword TEXT DEFAULT '';");
    console.log('[DB] Devices table migrated to include OPC UA fields.');
  }
} catch(e) { /* table doesn't exist yet, no action needed */ }

// ─── Migration guard: watch_items dataType column ───────────────────────────
try {
  const wCols = db.prepare("PRAGMA table_info(watch_items)").all();
  if (wCols.length > 0 && !wCols.some(c => c.name === 'dataType')) {
    db.exec("ALTER TABLE watch_items ADD COLUMN dataType TEXT DEFAULT '';");
    console.log('[DB] watch_items table migrated to include dataType.');
  }
} catch(e) { /* table doesn't exist yet, no action needed */ }

const init = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'guest'
    );

    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ip TEXT NOT NULL DEFAULT '',
      port INTEGER NOT NULL DEFAULT 502,
      slaveId INTEGER NOT NULL DEFAULT 1,
      type TEXT NOT NULL DEFAULT 'Modbus TCP',
      enabled INTEGER NOT NULL DEFAULT 1,
      opcuaEndpoint TEXT DEFAULT '',
      opcuaSecurityMode TEXT DEFAULT 'None',
      opcuaUsername TEXT DEFAULT '',
      opcuaPassword TEXT DEFAULT ''
    );

    -- Poll Groups: reusable variable templates, not tied to a device
    CREATE TABLE IF NOT EXISTS tag_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      startAddress INTEGER NOT NULL DEFAULT 0,
      readInterval INTEGER NOT NULL DEFAULT 1000,
      description TEXT DEFAULT ''
    );

    -- Tags: variables within a group, no address (offset is calculated from order + dataType)
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      groupId INTEGER NOT NULL,
      name TEXT NOT NULL,
      dataType TEXT NOT NULL DEFAULT 'Int16',  -- Bool, Int16, UInt16, Int32, UInt32, Float32
      bitOffset INTEGER DEFAULT 0,             -- only for Bool type
      unit TEXT DEFAULT '',
      sortOrder INTEGER NOT NULL DEFAULT 0,    -- position within group (determines register offset)
      FOREIGN KEY (groupId) REFERENCES tag_groups (id) ON DELETE CASCADE
    );

    -- Many-to-many: which groups are assigned to which devices
    CREATE TABLE IF NOT EXISTS device_group_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deviceId INTEGER NOT NULL,
      groupId INTEGER NOT NULL,
      UNIQUE(deviceId, groupId),
      FOREIGN KEY (deviceId) REFERENCES devices (id) ON DELETE CASCADE,
      FOREIGN KEY (groupId) REFERENCES tag_groups (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS dashboards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      isVisible INTEGER NOT NULL DEFAULT 0,
      widgets TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS watch_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tagKey TEXT UNIQUE NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      dataType TEXT DEFAULT ''
    );
  `);

  // Seed admin
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', 'admin123', 'admin');
  }

  // Seed default device
  const deviceExists = db.prepare('SELECT id FROM devices LIMIT 1').get();
  if (!deviceExists) {
    db.prepare('INSERT INTO devices (name, ip, port, slaveId, type, enabled) VALUES (?, ?, ?, ?, ?, ?)').run(
      'PLC_1', '192.168.1.170', 502, 1, 'Modbus TCP', 1
    );
  }
};

init();

module.exports = db;
