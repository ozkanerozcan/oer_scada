# Kural: Mimari Standartlar (Gerçek Proje)

## Stack

- **Backend:** Node.js, Fastify, better-sqlite3, modbus-serial, @fastify/websocket, @fastify/jwt, @fastify/cors
- **Frontend:** React (Vite), Zustand, lucide-react, Vanilla CSS (CSS Variables)
- **DB:** SQLite — `backend/data/scada.db`
- **Realtime:** Native WebSocket (`/ws` endpoint, `@fastify/websocket`)

---

## Backend — Dosya Yapısı (Gerçek)

```
backend/
  src/
    index.js                  ← TÜM route'lar buradadır (ayrı route dosyası yok)
    database/
      db.js                   ← Schema init, seed, module.exports = db
    services/
      modbusService.js        ← Polling engine (startDevicePolling, restartPolling)
  data/
    scada.db
```

> **Önemli:** Route'lar ayrı dosyalara bölünmemiş, hepsi `index.js` içinde tanımlıdır. Bu konvansiyona uyulmalıdır — yeni route eklendiğinde `index.js`'e eklenir.

---

## API Kalıpları (Aktif)

```
GET|POST         /api/auth/login
GET|POST         /api/devices
GET|PUT|DELETE   /api/devices/:id
POST             /api/devices/ping        ← net.Socket ile TCP ping
POST             /api/modbus/direct       ← Tek seferlik okuma/yazma

GET|POST         /api/groups
GET|PUT|DELETE   /api/groups/:id
POST             /api/groups/:id/devices  ← Cihaz atama
DELETE           /api/groups/:id/devices/:deviceId

POST             /api/tags               ← groupId + name + dataType + unit
PUT|DELETE       /api/tags/:id
POST             /api/tags/reorder       ← [{id, sortOrder}]

GET              /ws                     ← WebSocket (realtime data)
```

---

## WebSocket Mesaj Formatı

```js
// Sunucudan istemciye (polling verisi)
{ type: 'DATA_UPDATE', deviceId: 1, payload: { 'PLC_1.Press_Group.Pressure': 23.5 } }
```

WebSocket key formatı: `{DeviceName}.{GroupName}.{TagName}`

---

## Frontend — Dosya Yapısı (Gerçek)

```
frontend/src/
  pages/
    Devices.jsx          ← Cihaz yönetimi
    TagManagement.jsx    ← Poll Group + değişken yönetimi
    Users.jsx            ← Kullanıcı yönetimi
    Dashboard.jsx        ← Ana ekran
  stores/
    authStore.js
    deviceStore.js       ← fetchDevices(), addDevice(), updateDevice(), deleteDevice()
    tagStore.js          ← fetchTags(), addTag(), updateTag(), deleteTag()
  services/
    api.js               ← fetch wrapper'ları (getDevices, createTag, vs.)
  components/            ← Paylaşılan bileşenler
```

---

## Zustand Store Kalıbı (Gerçek)

```js
import { create } from 'zustand'
import { getItems, createItem, updateItem as apiUpdate, deleteItem as apiDelete } from '@/services/api'

const useStore = create((set, get) => ({
  items: [],
  isLoading: false,

  fetchItems: async () => {
    set({ isLoading: true });
    const data = await getItems();
    set({ items: data, isLoading: false });
  },

  addItem: async (payload) => {
    const res = await createItem(payload);
    if (res.success) await get().fetchItems();
  },

  updateItem: async (payload) => {
    const res = await apiUpdate(payload.id, payload);
    if (res.success) await get().fetchItems();
  },

  deleteItem: async (id) => {
    const res = await apiDelete(id);
    if (res.success) set(state => ({ items: state.items.filter(i => i.id !== id) }));
  }
}))
```

---

## Vite API_URL

```js
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
```

Tüm API çağrıları bu base URL'i kullanır.

---

## Frontend Route'ları (Aktif)

```
/login
/ (Layout + Sidebar)
  /              → Dashboard
  /devices       → Device Management (admin)
  /tags          → Tag Management (admin)
  /users         → User Management (admin)
```

---

## Yetkilendirme Prensibi

- Admin-only sayfalar: `if (isGuest || currentUser?.role !== 'admin') return <Navigate to="/" />`
- JWT token `authStore.js` içinde; API çağrılarında header olarak eklenmesi opsiyonel (mevcut implementasyonda tüm endpoint'ler açık)

---

## Hata Yönetimi Prensibi

- Backend'de `try/catch` → `reply.code(400).send({ success: false, error: e.message })`
- Frontend'de **native `alert()` yasak** — tüm hata/bildirimler özel modal bileşeni ile gösterilir
- Loading state'ler için `Loader2` spinner ve disabled state zorunlu

---

## Polling Engine Prensibi

- 100ms interval tick, her grup kendi `readInterval`'ını takip eder (`lastPoll` timestamp)
- `isPolling` flag ile aynı socket üzerinde çakışan sorgu önlenir
- `restartPolling()`: interval ve client'ları temizle → 500ms sonra yeniden başlat
