# Skill: Tag Management (Tag Yönetimi)

## Amaç
Poll Group tabanlı tag yönetimi. Her grup birden fazla cihaza atanabilen bir değişken şablonudur.

---

## Mimari Özet

```
tag_groups (şablon)
  ↓ çoka-çok
device_group_assignments → devices
  ↓
tags (grupların içindeki değişkenler, sıralı, otomatik offset)
```

**Polling sırasında WebSocket key formatı:** `{DeviceName}.{GroupName}.{TagName}`
Örnek: `PLC_1.Press_Group.Pressure`

---

## Sayfa Yapısı (`src/pages/TagManagement.jsx`)

**Sol Panel — Poll Group Listesi**
- Grup adı, startAddress, readInterval, kullanılan register sayısı, atanmış cihaz badge'leri
- "New Poll Group" ile grup oluşturma

**Sağ Panel — Seçili Grup Detayı**
- Cihaz atama/çıkarma (badge sistemi, çoka-çok)
- Register kullanım çubuğu: `usedRegisters / 125`
- Değişken tablosu: ▲/▼ sıralama, otomatik offset, dataType, unit, boyut (W/B)
- "Add Variable" ile grup içine değişken ekleme

---

## Poll Group Konfigürasyon Modeli

```js
const group = {
  id: 1,
  name: 'Press_Group',
  startAddress: 0,       // Modbus başlangıç register adresi
  readInterval: 500,     // ms
  description: '',
  tags: [...],           // sıralı değişkenler
  assignedDevices: [...]  // atanmış cihazlar
}
```

## Variable (Tag) Modeli

```js
const tag = {
  id: 1,
  groupId: 1,
  name: 'Pressure',
  dataType: 'Float32',  // Bool, Int16, UInt16, Int32, UInt32, Float32
  bitOffset: 0,         // sadece Bool için
  unit: 'bar',
  sortOrder: 0,         // grup içi sıra → register offset buradan hesaplanır
  // registerOffset = sortOrder sırasına göre runtime'da hesaplanır
}
```

## Register Boyutları

| DataType | Register Sayısı | Byte |
|----------|-----------------|------|
| Bool / Int16 / UInt16 | 1 | 2 |
| Int32 / UInt32 / Float32 | 2 | 4 |

**Offset hesaplama:** Tags `sortOrder` sırasıyla sıralanır. Her tag'in registerOffset'i kendinden önceki tag'lerin boyutlarının toplamıdır. Yani sistem "sequential packing" yapar — boşluk bırakmaz.

## Max Register Limiti

- Bir grupta max **125 register** kullanılabilir (Modbus TCP standardı)
- Backend POST `/api/tags` üzerinde bu limit kontrol edilir ve aşılırsa 400 döner
- Frontend register usage bar ile görsel geri bildirim verir

## API Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/groups` | Tüm grupları tag ve cihazlarıyla döndür |
| POST | `/api/groups` | Yeni grup oluştur |
| PUT | `/api/groups/:id` | Grubu güncelle |
| DELETE | `/api/groups/:id` | Grubu ve tüm tag'lerini sil |
| POST | `/api/groups/:id/devices` | Gruba cihaz ata |
| DELETE | `/api/groups/:id/devices/:deviceId` | Cihaz atamasını kaldır |
| POST | `/api/tags` | Gruba değişken ekle (auto sortOrder, limit kontrolü) |
| PUT | `/api/tags/:id` | Değişken güncelle |
| DELETE | `/api/tags/:id` | Değişken sil |
| POST | `/api/tags/reorder` | Sürükle-bırak sonrası sır güncelle |
