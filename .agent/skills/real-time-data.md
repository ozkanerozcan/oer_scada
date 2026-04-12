# Skill: Gerçek Zamanlı Veri Motoru

## Amaç
Polling ile toplanan verilerin WebSocket üzerinden client'lara iletilmesi,
önbellek yönetimi ve event sistemi için standart yaklaşımı tanımlar.

---

## In-Memory Cache

```js
// Tag cache yapısı — backend'de global singleton
const tagCache = new Map(); // Map<tagId, TagValue>

// TagValue
{
  tagId: "uuid",
  value: 23.5,
  rawValue: 235,
  quality: "good", // good | bad | uncertain
  timestamp: Date.now()
}
```

- Cache her polling turunda güncellenir
- REST API `/api/tags/values` endpoint'i cache'den okur (DB'ye gitmez)
- İlk bağlantıda tüm cache client'a gönderilir

---

## WebSocket Olayları (Backend → Frontend)

| Olay | Payload | Açıklama |
|------|---------|----------|
| `tag:update` | `TagValue[]` | Değişen tag'lerin yeni değerleri |
| `tag:batch` | `TagValue[]` | İlk bağlantıda tüm tag değerleri |
| `device:status` | `{deviceId, status, message}` | Cihaz bağlantı durumu |
| `alarm:trigger` | `AlarmEvent` | Yeni alarm oluştu |
| `alarm:clear` | `{alarmId}` | Alarm kapandı |

## WebSocket Olayları (Frontend → Backend)

| Olay | Payload | Açıklama |
|------|---------|----------|
| `tag:write` | `{tagId, value}` | Tag yazma isteği |
| `subscribe` | `{tagIds: []}` | Belirli tag'leri dinle |

---

## Diff-Based Broadcast

Gereksiz veri transferini önlemek için sadece değişen değerler yayınlanır:

```js
// Backend: @fastify/websocket ile tüm bağlı client'lara yayın
function broadcastChanges(newValues, wss) {
  const changed = newValues.filter(v => {
    const prev = tagCache.get(v.tagId)
    return !prev || prev.value !== v.value || prev.quality !== v.quality
  })
  if (changed.length > 0) {
    const msg = JSON.stringify({ type: 'tag:update', payload: changed })
    wss.clients.forEach(client => {
      if (client.readyState === 1) client.send(msg) // OPEN
    })
  }
}
```

---

## Frontend Store (Zustand)

```js
// stores/tagStore.js
const useTagStore = create((set) => ({
  tags: {},            // Map<tagId, TagValue>
  deviceStatus: {},    // Map<deviceId, status>

  setTagValues: (values) => set((state) => ({
    tags: { ...state.tags, ...Object.fromEntries(values.map(v => [v.tagId, v])) }
  })),

  updateDeviceStatus: (deviceId, status) => set((state) => ({
    deviceStatus: { ...state.deviceStatus, [deviceId]: status }
  })),
}))
```

---

## Native WebSocket Bağlantı Yönetimi (Frontend)

```js
// services/ws.service.js  ← socket.io-client YOK, bağımlılık sıfır
import useTagStore from '@/stores/tagStore'
import useAlarmStore from '@/stores/alarmStore'
import useDeviceStore from '@/stores/deviceStore'

let ws = null
let retryTimer = null
const RETRY_DELAYS = [2000, 5000, 10000, 30000] // ms, progressive backoff
let retryCount = 0

export function connectWS(url) {
  ws = new WebSocket(url)

  ws.onopen = () => {
    retryCount = 0
    clearTimeout(retryTimer)
    console.info('[WS] Connected')
  }

  ws.onmessage = (event) => {
    const { type, payload } = JSON.parse(event.data)
    switch (type) {
      case 'tag:batch':
      case 'tag:update':
        useTagStore.getState().setTagValues(payload)
        break
      case 'device:status':
        useDeviceStore.getState().setDeviceStatus(payload.deviceId, payload.status)
        break
      case 'alarm:trigger':
        useAlarmStore.getState().addAlarm(payload)
        break
      case 'alarm:clear':
        useAlarmStore.getState().clearAlarm(payload.alarmId)
        break
    }
  }

  ws.onclose = () => {
    const delay = RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)]
    retryCount++
    retryTimer = setTimeout(() => connectWS(url), delay)
  }

  ws.onerror = (err) => console.error('[WS] Error', err)
}

// Frontend → Backend mesaj gönderimi
export function wsSend(type, payload) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }))
  }
}
```

---

## Mesaj Protokolü (JSON Sarmalanmış)

Tüm WebSocket mesajları `{ type: string, payload: any }` formatında taşınır:

```
Backend → Frontend:
  { type: 'tag:batch',    payload: TagValue[] }
  { type: 'tag:update',   payload: TagValue[] }
  { type: 'device:status',payload: { deviceId, status, message } }
  { type: 'alarm:trigger',payload: AlarmEvent }
  { type: 'alarm:clear',  payload: { alarmId } }

Frontend → Backend:
  { type: 'tag:write',  payload: { tagId, value } }
  { type: 'subscribe',  payload: { tagIds: [] } }
```

---

## Backend WebSocket Kurulumu (@fastify/websocket)

```js
// Fastify backend
await fastify.register(require('@fastify/websocket'))

fastify.get('/ws', { websocket: true }, (socket, req) => {
  // İlk bağlantıda tüm cache gönder
  const batch = [...tagCache.values()]
  socket.send(JSON.stringify({ type: 'tag:batch', payload: batch }))

  socket.on('message', (raw) => {
    const { type, payload } = JSON.parse(raw)
    if (type === 'tag:write') handleTagWrite(payload, req.user)
  })
})
```

---

## Performans Notları

- 500 tag, 1 sn interval → saniyede maksimum 500 güncelleme (diff ile genelde çok daha az)
- JSON.stringify/parse maliyeti minimal; gerekirse MessagePack geçilebilir
- Frontend: `React.memo`, `useMemo` ile gereksiz re-render önlenir
- Her component sadece kullandığı tag'leri Zustand selector ile okur
