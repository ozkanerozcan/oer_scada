const ModbusRTU = require("modbus-serial");
const client = new ModbusRTU();

const PLC_IP = "192.168.1.170";
const PLC_PORT = 502;

async function testModbusTCP() {
    try {
        console.log(`[Modbus Test] Bağlanıyor: ${PLC_IP}:${PLC_PORT}...`);
        
        await client.connectTCP(PLC_IP, { port: PLC_PORT });
        // Önceki denemede 1 de 10 da çalışmıştı, standart 1'i kullanıyoruz.
        client.setID(1);
        client.setTimeout(2000); 
        
        console.log(`[Modbus Test] Bağlantı başarılı! Unit ID: 1`);
        
        // Yazılacak değer: 47.56
        const targetValue = 47.56;
        
        // 32-bit Float'u byte dizisine ve 16-bit registerlara çevirme
        const floatBuffer = Buffer.alloc(4);
        floatBuffer.writeFloatBE(targetValue, 0); // Big-Endian formatta yaz
        const registers = [
            floatBuffer.readUInt16BE(0),
            floatBuffer.readUInt16BE(2)
        ];
        
        console.log(`[Modbus Test] Float Değer: ${targetValue} -> Hex: ${floatBuffer.toString('hex')} -> Registerlar:`, registers);
        
        // Fonksiyon kodu 16 (Write Multiple Registers), Adres 0, yazılacak register array'i
        console.log(`[Modbus Test] Adres 0'a 2 adet Holding Register yazılıyor...`);
        const writeResult = await client.writeRegisters(0, registers);
        console.log(`[Modbus Test] YAZMA BAŞARILI (Fonksiyon 16)! Dönüş:`, writeResult);

        // Yazıldığını teyit etmek için hemen geri okuyalım
        console.log(`[Modbus Test] Değerin yazılıp yazılmadığını teyit etmek için tekrar okunuyor...`);
        const readData = await client.readHoldingRegisters(0, 2);
        
        // Okunan baytları tekrar float'a çevir
        const readFloat = readData.buffer.readFloatBE(0);
        console.log(`[Modbus Test] TEYİT BAŞARILI: Adres 0 Yeni Değeri:`, readFloat);

    } catch (error) {
        console.error(`[Modbus Test] Bağlantı, okuma veya yazma hatası:`, error.message);
    } finally {
        if (client.isOpen) {
            client.close();
            console.log(`[Modbus Test] Bağlantı kapatıldı.`);
        }
    }
}

testModbusTCP();
