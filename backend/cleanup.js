const db = require('./src/database/db');
db.prepare("DELETE FROM tags WHERE name IN ('Bool1', 'Bool2', 'Bool3', 'Counter')").run();
console.log('Test tags deleted');
