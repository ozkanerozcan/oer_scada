const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'data', 'scada.db'));

const dups = db.prepare('SELECT deviceId FROM device_group_assignments GROUP BY deviceId HAVING COUNT(*) > 1').all();
for (const {deviceId} of dups) {
  console.log(`Fixing duplicate assignments for device ${deviceId}`);
  const lastGroup = db.prepare('SELECT groupId FROM device_group_assignments WHERE deviceId=? ORDER BY id DESC LIMIT 1').get(deviceId);
  db.prepare('DELETE FROM device_group_assignments WHERE deviceId=?').run(deviceId);
  if (lastGroup) {
    db.prepare('INSERT INTO device_group_assignments (deviceId, groupId) VALUES (?, ?)').run(deviceId, lastGroup.groupId);
  }
}
console.log('Cleanup finished. The database is now strictly 1-to-N.');
