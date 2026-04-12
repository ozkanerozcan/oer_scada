# Skill: Veritabanı Operasyonları

## Amaç
SQLite (better-sqlite3) kullanımı, aktif şema ve veri erişimi için standartlar.

---

## Aktif Şema (`backend/src/database/db.js`)

### users
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'guest'
);
```

### devices
```sql
CREATE TABLE devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  ip TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 502,
  slaveId INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1
);
```

### tag_groups (Poll Group şablonları)
```sql
CREATE TABLE tag_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  startAddress INTEGER NOT NULL DEFAULT 0,
  readInterval INTEGER NOT NULL DEFAULT 1000,
  description TEXT DEFAULT ''
);
```

### tags (Grup içi değişkenler — adres yok, offset otomatik hesaplanır)
```sql
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  groupId INTEGER NOT NULL,
  name TEXT NOT NULL,
  dataType TEXT NOT NULL DEFAULT 'Int16',  -- Bool, Int16, UInt16, Int32, UInt32, Float32
  bitOffset INTEGER DEFAULT 0,
  unit TEXT DEFAULT '',
  sortOrder INTEGER NOT NULL DEFAULT 0,    -- grup içi sıra, offset buradan hesaplanır
  FOREIGN KEY (groupId) REFERENCES tag_groups (id) ON DELETE CASCADE
);
```

### device_group_assignments (Çoka-çok: hangi grup hangi cihazlara)
```sql
CREATE TABLE device_group_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deviceId INTEGER NOT NULL,
  groupId INTEGER NOT NULL,
  UNIQUE(deviceId, groupId),
  FOREIGN KEY (deviceId) REFERENCES devices (id) ON DELETE CASCADE,
  FOREIGN KEY (groupId) REFERENCES tag_groups (id) ON DELETE CASCADE
);
```

---

## Kurallar

- Tüm sorgular `db.prepare()` ile hazırlanır (SQL injection koruması)
- `PRAGMA foreign_keys = ON` aktif edilir
- Transaction gerektiren işlemler `db.transaction()` ile sarılır
- Tags silindiğinde CASCADE ile ilişkili tüm tag'ler de silinir
- `CREATE TABLE IF NOT EXISTS` kullanılır (idempotent başlangıç)

---

## Register Offset Hesaplama (Runtime)

Tag adresi veritabanında saklanmaz. Backend her polling döngüsünde:

```js
let offset = 0;
const tagMeta = tags.map(tag => {
  const rs = getRegisterSize(tag.dataType);
  const meta = { ...tag, registerOffset: offset, regSize: rs };
  offset += rs;
  return meta;
});
// Modbus: readHoldingRegisters(group.startAddress, offset)
// Her tag için: buffer.subarray(tag.registerOffset * 2, ...)
```

---

## Seed Verisi

Uygulama ilk başladığında:
- `admin` kullanıcısı yoksa oluşturulur (admin123)
- `devices` tablosu boşsa PLC_1 (192.168.1.170:502) eklenir
