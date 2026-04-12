const db = require('../src/database/db.js')

console.log('Updating device name from Pres1 to PRes1...')

try {
  const result = db.prepare('UPDATE devices SET name = ? WHERE name = ?').run('PRes1', 'Pres1')
  console.log('Updated', result.changes, 'device(s)')
  console.log('Updated device name:', db.prepare('SELECT * FROM devices WHERE name = ?').get('PRes1'))
} catch (error) {
  console.error('Error updating device name:', error)
}

process.exit(0)
