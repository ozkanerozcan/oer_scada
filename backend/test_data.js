const db = require('./src/database/db');

// Ensure there is at least one group
let group = db.prepare('SELECT id FROM tag_groups ORDER BY id ASC LIMIT 1').get();
if (!group) {
  const info = db.prepare('INSERT INTO tag_groups (name, startAddress) VALUES (?, ?)').run('Test Group', 0);
  group = { id: info.lastInsertRowid };
}

const groupId = group.id;

console.log(`Adding 120 registers to Group IT: ${groupId}`);

// delete old tags in this group to avoid exceeding tests
db.prepare('DELETE FROM tags WHERE groupId = ?').run(groupId);

const insertTag = db.prepare('INSERT INTO tags (groupId, name, dataType, bitOffset, unit, sortOrder) VALUES (?, ?, ?, ?, ?, ?)');

db.transaction(() => {
  for (let i = 1; i <= 120; i++) {
    // 120 Int16 tags = 120 registers
    insertTag.run(groupId, `Auto_Tag_${i}`, 'Int16', 0, 'raw', i);
  }
})();

console.log('Successfully added 120 tags.');
