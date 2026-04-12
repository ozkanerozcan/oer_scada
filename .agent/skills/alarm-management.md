# Skill: Alarm Yönetimi

## Amaç
SCADA alarm sisteminin tasarımı, tetikleme mantığı, bildirim akışı
ve onay süreçleri için standart yaklaşımı tanımlar.

---

## Alarm Türleri

| Tür | Tetikleyici | Severity |
|-----|-------------|----------|
| `high` | Değer > alarm_high eşiği | warning / critical |
| `low` | Değer < alarm_low eşiği | warning / critical |
| `comm_error` | Cihaz bağlantısı koptu | critical |
| `bad_quality` | Tag verisi güvenilmez | warning |

---

## Alarm Yaşam Döngüsü

```
[Normal] ──trigger──► [Active]
                          │
                       [Acked]  ← Operatör onayladı
                          │
            value_ok ──► [Cleared]
                          │
                       [Closed]  → DB'de kayıtlı
```

- Alarm **tetiklendiğinde**: `alarms` tablosuna eklenir, WebSocket ile yayınlanır
- Alarm **onaylandığında**: `ack_by` ve `ack_at` güncellenir
- Alarm **kapandığında**: `cleared_at` güncellenir
- Aynı tag için aynı anda sadece 1 aktif alarm olabilir (spam koruması)

---

## Tetikleme Motoru

Polling callback'i içinde her tag değeri için kontrol:

```js
// wss = fastify WebSocket server instance (@fastify/websocket)
function wsBroadcast(wss, type, payload) {
  const msg = JSON.stringify({ type, payload })
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg)
  })
}

function checkAlarms(tag, newValue, wss) {
  const activeAlarm = AlarmModel.getActiveByTagId(tag.id)

  // HIGH alarm
  if (tag.alarm_high !== null && newValue > tag.alarm_high) {
    if (!activeAlarm || activeAlarm.type !== 'high') {
      const alarm = {
        id: uuid(),
        tag_id: tag.id,
        type: 'high',
        severity: 'warning',
        message: `${tag.name} değeri ${newValue} ${tag.unit} — Üst limit: ${tag.alarm_high}`,
        triggered_at: Date.now()
      }
      AlarmModel.create(alarm)
      wsBroadcast(wss, 'alarm:trigger', alarm)
    }
  }
  // Alarm kapama
  else if (activeAlarm) {
    AlarmModel.clear(activeAlarm.id, Date.now())
    wsBroadcast(wss, 'alarm:clear', { alarmId: activeAlarm.id, clearedAt: Date.now() })
  }
}
```

---

## WebSocket Olayları

Tüm mesajlar `{ type, payload }` JSON formatındadır (native WebSocket protokolü):

| type | Yön | Payload |
|------|-----|------|
| `alarm:trigger` | Server→Client | `{id, tagId, type, severity, message, triggeredAt}` |
| `alarm:clear` | Server→Client | `{alarmId, clearedAt}` |
| `alarm:ack` | Client→Server | `{alarmId}` — JWT kimlik doğrulama header'dan alınır |
| `alarm:batch` | Server→Client | Tüm aktif alarmlar (ilk bağlantıda gönderilir) |

---

## Frontend Alarm State (Zustand)

```js
// stores/alarmStore.js
const useAlarmStore = create((set) => ({
  activeAlarms: [],    // AlarmEvent[]
  
  addAlarm: (alarm) => set((s) => ({
    activeAlarms: [...s.activeAlarms, alarm]
  })),
  
  clearAlarm: (alarmId) => set((s) => ({
    activeAlarms: s.activeAlarms.filter(a => a.id !== alarmId)
  })),
  
  ackAlarm: (alarmId) => set((s) => ({
    activeAlarms: s.activeAlarms.map(a =>
      a.id === alarmId ? { ...a, acked: true } : a
    )
  })),
}));
```

---

## Alarm UI Kuralları

- Header'da aktif alarm sayısı badge'i gösterilir (renk: warning/danger)
- Kritik alarmlar ses çıkarabilir (opsiyonel, kullanıcı tercihi)
- Onaysız alarmlar yanıp söner (CSS animation)
- Alarm listesi sayfası: Aktif / Tarihsel sekmeli görünüm
- Her alarm satırında: Tag adı, Değer, Limit, Zaman, Onay butonu
