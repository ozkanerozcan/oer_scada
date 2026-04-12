# Skill: Modbus Haberleşme

## Amaç
Modbus TCP polling mimarisini ve yazma/okuma standartlarını tanımlar.

---

## Modbus Register Tipleri

| Tip | Erişim | Açıklama |
|-----|--------|----------|
| Holding Register (4x) | R/W | Tüm tag'ler bu tipte okunur/yazılır |
| Coil (0x) | R/W | Bool dijital çıkış (/api/modbus/direct için) |
| Input Register (3x) | R | Sadece okuma analog |

> **Mevcut implementasyonda tüm polling'ler Holding Register üzerinden yapılır.**

---

## Poll Group Mimarisi

Her **Poll Group** bir küme değişkene sahip bir şablondur ve birden fazla cihaza atanabilir:

```
Group "Press_Group" (startAddress: 0, interval: 500ms)
  ├── Pressure   Float32  → offset 0, 2 register
  ├── Speed      Int16    → offset 2, 1 register
  └── Running    Bool     → offset 3, 1 register (bit 0)
  Total: 4 registers → readHoldingRegisters(0, 4)

Atanmış: PLC_1 (192.168.1.10) + PLC_2 (192.168.1.11)
→ Her iki PLC'den de aynı adres bloğu okunur
```

### Register ve Byte Boyutları (Siemens Standardı)

Sistem **Byte-Based Addressing** (Siemens / Industrial Standard) kullanır.

| DataType | Register | Byte | Açıklama |
|----------|----------|------|-----------|
| **Bool** | 1 (bit) | 2 | 16 bitlik 1 Register'a paketlenir. |
| **Int16 / UInt16** | 1 | 2 | |
| **Int32 / UInt32 / Float32** | 2 | 4 | |

#### Boolean Bit-Packing Kuralları
Boolean'lar 16-bitlik register'lar içinde byte sınırlarına göre hizalanır:
- `0.0` - `0.7`: İlk Byte (High Byte)
- `1.0` - `1.7`: İkinci Byte (Low Byte)

Max 125 register / 250 byte / grup (Modbus TCP standardı).

---

## Polling Engine (`backend/src/services/modbusService.js`)

```
startDevicePolling(fastify)
  → Her enabled device için:
    → O cihaza atanmış tüm grupları çek
    → Her grup için buildPollingBlocks(db, deviceId)
    → TCP bağlantı kur (ModbusRTU.connectTCP)
    → setInterval(interval) — her cycle'da:
        1. **Port Check**: `if (!client.isOpen)` ise `connectTCP` (Auto-Reconnect).
        2. **Poll Groups**: `if (now - block.lastPoll >= group.readInterval)`:
           - **Per-Tag Read**: Her tag için `readHoldingRegisters(absAddr, regSize)`.
           - **Memoization**: Aynı register'daki tag'ler için cache kullanılır.
           - WebSocket broadcast: { type: 'DATA_UPDATE', deviceId, payload }
```

**Auto-Reconnect**: PLC bağlantısı koptuğunda (örn: Illegal Address hatasından dolayı) sistem bir sonraki cycle'da otomatik olarak yeniden bağlanmayı dener. Tag okuma hataları loglanır ancak diğer tag'lerin okunması devam eder.

---

## Buffer Parsing

```js
function parseBufferValue(buffer, dataType, bitOffset = 0) {
  const dt = dataType.toLowerCase();
  if (dt === 'float32') return buffer.readFloatBE(0);
  if (dt === 'int32')   return buffer.readInt32BE(0);
  if (dt === 'uint32')  return buffer.readUInt32BE(0);
  if (dt === 'uint16')  return buffer.readUInt16BE(0);
  if (dt === 'bool') {
    const byteIndex = Math.floor(bitOffset / 8);
    const bitIndex = bitOffset % 8;
    return (buffer[byteIndex] >> bitIndex) & 1;
  }
  return buffer.readInt16BE(0);
}
```

> **Byte Order:** Big Endian (BE). Siemens S7 byte dizilimiyle tam uyumludur (0.0 offseti byte 0'ın ilk bitidir).

---

## Bağlantı Yönetimi

- `restartPolling(fastify)`: Tüm interval'ları ve client'ları durdurur, 500ms sonra yeniden başlatır
- Bağlantı hatası → `console.error` + o grup skip edilir, diğer gruplar çalışmaya devam eder
- Ping testi: `net.Socket` ile TCP bağlantısı denenir (modbus-serial kullanılmaz — crash riski)

---

## Yazma İşlemi (Direct)

`POST /api/modbus/direct` — tek seferlik okuma/yazma (dashboard test amaçlı):

```js
{ ip, port, unitId, address, type: 'Int'|'Real'|'Bool', operation: 'Read'|'Write', value }
```

- Int: `writeRegister(address, value)`
- Real: `writeRegisters(address, [hi, lo])`
- **Bool (RMW)**: Holding Register içindeki bitleri yazmak için **Read-Modify-Write** döngüsü kullanılır:
  ```js
  const r = await client.readHoldingRegisters(address, 1);
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(r.data[0]);
  if (value) buf[byteIdx] |= (1 << bitIdx);
  else buf[byteIdx] &= ~(1 << bitIdx);
  await client.writeRegister(address, buf.readUInt16BE(0));
  ```

---

## Kütüphane

```bash
npm install modbus-serial
# Her cihaz için: new ModbusRTU() → connectTCP → setID → readHoldingRegisters
```
