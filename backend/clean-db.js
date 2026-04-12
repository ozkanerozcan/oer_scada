const db = require('./src/database/db');
db.prepare("DELETE FROM watch_items WHERE tagKey LIKE 'PLC 1 MODBUS TCP%'").run();
console.log('Deleted old PLC 1 tags from watch_items.');
