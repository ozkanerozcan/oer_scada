// Live Modbus read test – reads Monitoring group registers from 192.168.1.170
const ModbusRTU = require('modbus-serial');

const IP = '192.168.1.170';
const PORT = 502;
const UNIT_ID = 1;
const START_ADDR = 0;
const TOTAL_REGS = 8; // Temp1(2) + Counter(2) + Temp2(2) + Temp3(2)

const client = new ModbusRTU();

async function test() {
  try {
    console.log(`Connecting to ${IP}:${PORT} unit ${UNIT_ID}...`);
    await client.connectTCP(IP, { port: PORT });
    client.setID(UNIT_ID);
    client.setTimeout(3000);
    console.log('Connected!\n');

    const data = await client.readHoldingRegisters(START_ADDR, TOTAL_REGS);
    const buf = data.buffer;
    console.log('Raw buffer (hex):', buf.toString('hex'));
    console.log('Raw registers:', data.data, '\n');

    // Parse each tag
    const tags = [
      { name: 'Temp1',   type: 'float32', offset: 0 },
      { name: 'Counter', type: 'int32',   offset: 4 },
      { name: 'Temp2',   type: 'float32', offset: 8 },
      { name: 'Temp3',   type: 'float32', offset: 12 },
    ];

    for (const tag of tags) {
      const slice = buf.subarray(tag.offset, tag.offset + 4);
      let val;
      if (tag.type === 'float32') val = slice.readFloatBE(0);
      else if (tag.type === 'int32') val = slice.readInt32BE(0);
      console.log(`  [${tag.type}] ${tag.name} = ${val}`);
    }

    client.close();
    console.log('\nTest complete!');
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

test();
