# Skill: Device Management (Cihaz Yönetimi)

## Amaç
SCADA sistemine bağlı tüm PLC ve Endüstriyel cihazların yapılandırılmasını ve izlenmesini sağlayan yönetim modülünün standartlarını belirler.

---

## Sayfa Yapısı (`src/pages/Devices.jsx`)

Cihaz yönetim sayfası **sadece `admin`** rolüne sahip kullanıcılar tarafından erişilebilir olmalıdır. Supervisor veya diğer roller bu sayfaya erişemez.

### Temel Özellikler
- **Liste Görünümü:** Modbus (TCP/RTU) cihazlarının listesi. (Cihaz Adı, IP/Port, Slave ID, Bağlantı Durumu).
- **Bağlantı Durum Gösterimi:** `StatusBadge` bileşeni kullanılarak anlık bağlantı (connected/disconnected/error) gösterilir.
- **CRUD İşlemleri:** Cihaz ekleme formlarında Modbus TCP için IP ve Port, Modbus RTU için COM Port, Baud Rate gibi konfigürasyon girişleri yer alır.
- **Tasarım:** Users sayfasında kurulan tablo ve modal mimarisi ile aynı (Tutarlı, teal-theme ağırlıklı, responsive).

## Global Store Entegrasyonu

Cihazlar `useDeviceStore` (Zustand) üzerinde tutulur. Diğer sayfalar (örneğin Tag Yönetimi) bu store üzerinden cihaz listesine erişir.

```javascript
// Store durumu örneği
{
  devices: [
    { id: '1', name: 'Ana Pompa PLC', ip: '192.168.1.100', port: 502, slaveId: 1, status: 'connected' }
  ],
  addDevice: (device) => { ... },
  updateDevice: (id, updates) => { ... },
  deleteDevice: (id) => { ... }
}
```

## Device Configuration Requirements
Cihaz formlarında standart olarak aşağıdaki bilgiler toplanmalı ve yönetilmelidir:
- **Device Name**: A human-readable identifier (e.g., `PLC_1`).
- **IP Address**: The target IPv4 address of the Modbus Server (e.g., `192.168.1.170`).
- **Port**: The TCP port (default is usually `502`, ama editlenebilir olmalı).
- **Status (Active / Passive)**: Cihazın poll sürecine dahil olup olmadığını belirleyen durum (Active: Polling aktif, Passive: Sistemde kayıtlı ancak pasif).

## Standart Mock Cihaz (Örnek PLC)
Projelerde test amacıyla kullanılacak default mock PLC konfigürasyonu şu şekildedir:
- **Name**: `PLC_1`
- **IP Address**: `192.168.1.170`
- **Port**: `502`
- **Status**: Active
