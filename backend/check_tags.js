const db = require('./src/database/db');
const tags = db.prepare(`
  SELECT t.id, t.name, t.dataType, t.sortOrder, t.unit, g.name as grp, g.startAddress
  FROM tags t
  JOIN tag_groups g ON g.id = t.groupId
  ORDER BY g.name, t.sortOrder
`).all();

// Calculate register offsets manually
const REG_SIZE = { bool: 1, int16: 1, uint16: 1, int32: 2, uint32: 2, float32: 2 };
function getSize(dt) { return REG_SIZE[(dt || '').toLowerCase()] || 1; }

const grouped = {};
for (const tag of tags) {
  if (!grouped[tag.grp]) grouped[tag.grp] = { startAddress: tag.startAddress, tags: [] };
  grouped[tag.grp].tags.push(tag);
}

for (const [grp, data] of Object.entries(grouped)) {
  let offset = 0;
  console.log(`\n=== Group: ${grp} (startAddr: ${data.startAddress}) ===`);
  for (const tag of data.tags) {
    const size = getSize(tag.dataType);
    const absAddr = data.startAddress + offset;
    console.log(`  [${tag.dataType}] ${tag.name} → absAddr=${absAddr} offset=${offset} size=${size} unit=${tag.unit || '-'}`);
    offset += size;
  }
}
