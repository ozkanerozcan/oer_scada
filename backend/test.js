const existing = [
  { id: 157, name: 'Bool1', dataType: 'Bool', bitOffset: 0 }
];

let cursor = 0;
let boolSlotOffset = null;
let boolSlotUsed = 0;

for (const t of existing) {
  if (t.dataType === 'Bool') {
    if (boolSlotOffset === null || boolSlotUsed >= 16) {
      boolSlotOffset = cursor;
      boolSlotUsed   = 0;
      cursor        += 1;
    }
    boolSlotUsed++;
  } else {
    boolSlotOffset = null;
    boolSlotUsed   = 0;
    cursor += 1;
  }
}

let finalBitOffset = 0;
let extraRegisters = 1;

const dataType = 'Bool';
if (dataType === 'Bool') {
  if (boolSlotOffset !== null && boolSlotUsed < 16) {
    // Reuse the currently open Bool slot: next free bit
    finalBitOffset  = boolSlotUsed;   // bits 0..15 in insertion order
    extraRegisters  = 0;              // no new register needed
  } else {
    // Need a fresh register slot
    finalBitOffset  = 0;
    extraRegisters  = 1;
  }
}

console.log('finalBitOffset:', finalBitOffset);
console.log('extraRegisters:', extraRegisters);
