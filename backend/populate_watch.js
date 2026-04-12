const db = require('./src/database/db');
const devices = db.prepare('SELECT * FROM devices').all();
const groups = db.prepare('SELECT * FROM tag_groups').all();
const tags = db.prepare('SELECT * FROM tags').all();
const assignments = db.prepare('SELECT * FROM device_group_assignments').all();

let sortOrder = 1;
let added = 0;
for (const a of assignments) {
  const device = devices.find(d => d.id === a.deviceId);
  const group = groups.find(g => g.id === a.groupId);
  if (!device || !group) continue;
  
  const groupTags = tags.filter(t => t.groupId === a.groupId);
  for (const tag of groupTags) {
    const tagKey = `${device.name}.${group.name}.${tag.name}`;
    try {
      db.prepare('INSERT OR IGNORE INTO watch_items (tagKey, sortOrder) VALUES (?, ?)').run(tagKey, sortOrder++);
      added++;
    } catch(e) {}
  }
}
console.log(`Bütün tagler watch_items tablosuna eklendi. Toplam: ${added} değişken eklendi.`);
