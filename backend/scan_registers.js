// Scan different register ranges to find which ones the PLC accepts
const ModbusRTU = require('modbus-serial');

const IP = '192.168.1.170';
const PORT = 502;
const UNIT_ID = 1;

// Common starting addresses to probe
const TEST_RANGES = [
  { addr: 0, count: 2, label: 'MW0' },
  { addr: 100, count: 2, label: 'MW100' },
  { addr: 200, count: 2, label: 'MW200' },
  { addr: 400, count: 2, label: 'MW400' },
  { addr: 1000, count: 2, label: 'MW1000' },
  { addr: 4000, count: 2, label: 'MW4000' },
  { addr: 40000, count: 2, label: '%MW40000' },
];

const client = new ModbusRTU();

async function test() {
  await client.connectTCP(IP, { port: PORT });
  client.setID(UNIT_ID);
  client.setTimeout(2000);
  console.log(`Connected to ${IP}:${PORT}\n`);

  for (const range of TEST_RANGES) {
    try {
      const data = await client.readHoldingRegisters(range.addr, range.count);
      console.log(`✅ ${range.label} (addr ${range.addr}): ${data.data} | hex: ${data.buffer.toString('hex')}`);
    } catch (err) {
      console.log(`❌ ${range.label} (addr ${range.addr}): ${err.message.slice(0,60)}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  client.close();
}

test().catch(e => { console.error(e.message); process.exit(1); });
