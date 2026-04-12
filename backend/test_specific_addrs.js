const ModbusRTU = require('modbus-serial');
const client = new ModbusRTU();

async function test() {
  await client.connectTCP('192.168.1.170', { port: 502 });
  client.setID(1);
  client.setTimeout(2000);
  
  const addrs = [0, 2, 4, 6];
  for (const a of addrs) {
    try {
      const data = await client.readHoldingRegisters(a, 2);
      console.log(`ADDR ${a}: OK - ${data.buffer.toString('hex')}`);
    } catch (e) {
      console.log(`ADDR ${a}: FAIL - ${e.message}`);
    }
  }
  client.close();
}
test();
