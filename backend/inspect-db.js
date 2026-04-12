const db = require('./src/database/db');
const watchItems = db.prepare('SELECT * FROM watch_items').all();
const devices = db.prepare('SELECT id, name FROM devices').all();
const groups = db.prepare('SELECT id, name FROM tag_groups').all();
const tags = db.prepare('SELECT id, groupId, name FROM tags').all();

console.log('Watch items:', watchItems);
console.log('Devices:', devices);
console.log('Groups:', groups);
console.log('Tags:', tags);
