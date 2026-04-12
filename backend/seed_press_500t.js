const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, './data/scada.db');
const db = new Database(dbPath, { verbose: console.log });

const tags = [
    { name: 'Operating Mode', dataType: 'Int16', unit: '0: Off, 1: Inch, 2: Tek Çevrim, 3: Continious' },
    { name: 'Ready', dataType: 'Bool', unit: 'OK/NOK' },
    { name: 'Main Motor Running', dataType: 'Bool', unit: 'OK/NOK' },
    { name: 'Lubrication Running', dataType: 'Bool', unit: 'OK/NOK' },
    { name: 'Main Motor Speed', dataType: 'Int16', unit: 'rpm' },
    { name: 'Main Motor Current', dataType: 'Float32', unit: 'A' },
    { name: 'Speed Actual', dataType: 'Int16', unit: 'SPM' },
    { name: 'Speed Set', dataType: 'Int16', unit: 'SPM' },
    { name: 'Angle', dataType: 'Int16', unit: '°' },
    { name: 'Regulation Position', dataType: 'Float32', unit: 'mm' },
    { name: 'Pressure Actual Bar', dataType: 'Int16', unit: 'Bar' },
    { name: 'Pressure Actual Ton', dataType: 'Int16', unit: 'Ton' },
    { name: 'Last Tonnage', dataType: 'Int16', unit: 'Ton' },
    { name: 'Set Limit Tonnage', dataType: 'Int16', unit: 'Ton' },
    { name: 'Counter Desired', dataType: 'Int16', unit: 'Adet' },
    { name: 'Counter Aktüel', dataType: 'Int16', unit: 'Adet' },
    { name: 'Crank Temperature 1', dataType: 'Int16', unit: '°C' },
    { name: 'Crank Temperature 2', dataType: 'Int16', unit: '°C' },
    { name: 'Crank Temperature 3', dataType: 'Int16', unit: '°C' },
    { name: 'Crank Temperature 4', dataType: 'Int16', unit: '°C' }
];

try {
    const groupName = 'Press_500T';
    
    // Check if group exists
    let group = db.prepare('SELECT id FROM tag_groups WHERE name = ?').get(groupName);
    
    if (!group) {
        console.log(`Creating group: ${groupName}`);
        const result = db.prepare('INSERT INTO tag_groups (name, startAddress, readInterval, description) VALUES (?, ?, ?, ?)')
            .run(groupName, 0, 1000, '500T Press Machine variables');
        group = { id: result.lastInsertRowid };
    } else {
        console.log(`Group ${groupName} already exists (id: ${group.id}).`);
    }

    // Insert tags
    const insertTag = db.prepare(`
        INSERT INTO tags (groupId, name, dataType, unit, sortOrder) 
        VALUES (?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
        // Clear existing tags in this group to avoid duplicates if re-running
        db.prepare('DELETE FROM tags WHERE groupId = ?').run(group.id);
        
        tags.forEach((tag, index) => {
            console.log(`Adding tag: ${tag.name}`);
            insertTag.run(group.id, tag.name, tag.dataType, tag.unit, index);
        });
    })();

    console.log(`Successfully added ${tags.length} tags to ${groupName}.`);

    // Optional: assign to first device if not assigned
    const defaultDevice = db.prepare('SELECT id FROM devices LIMIT 1').get();
    if (defaultDevice) {
        const assignment = db.prepare('SELECT id FROM device_group_assignments WHERE deviceId = ? AND groupId = ?')
            .get(defaultDevice.id, group.id);
        if (!assignment) {
            console.log(`Assigning ${groupName} to device ID ${defaultDevice.id}`);
            db.prepare('INSERT INTO device_group_assignments (deviceId, groupId) VALUES (?, ?)').run(defaultDevice.id, group.id);
        }
    }

} catch (err) {
    console.error('Error seeding database:', err);
} finally {
    db.close();
}
