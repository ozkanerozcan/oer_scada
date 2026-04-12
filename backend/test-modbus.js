const ModbusRTU = require("modbus-serial");
const client = new ModbusRTU();

async function test() {
  try {
    await client.connectTCP("192.168.1.170", { port: 502 });
    client.setID(1);
    client.setTimeout(2000);
    console.log("Connected");

    for (const count of [1, 2, 3, 4, 5, 6, 7, 8]) {
      try {
        const r = await client.readHoldingRegisters(0, count);
        console.log(`readHoldingRegisters(0, ${count}) SUCCESS:`, r.data);
      } catch (e) {
        console.log(`readHoldingRegisters(0, ${count}) FAILED: ${e.message}`);
      }
    }

    client.close();
  } catch (err) {
    console.error("Connection Failed:", err.message);
  }
}

test();
