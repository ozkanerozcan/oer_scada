# Kural: Kod Yazım Standartları (Gerçek Proje)

## Genel

- **Dil:** JavaScript (ES2022+, CommonJS backend / ESM frontend)
- **Girinti:** 2 boşluk
- **String:** Tek tırnak `'` (template literal gerektiğinde backtick)

---

## Backend (Fastify / Node.js)

### Kullanım Alışkanlıkları

```js
// Route inline, model katmanı yok — tüm SQL index.js içinde
fastify.get('/api/items', async () => {
  return db.prepare('SELECT * FROM items').all()
})

fastify.post('/api/items', async (request, reply) => {
  const { name, value } = request.body
  try {
    const info = db.prepare('INSERT INTO items (name, value) VALUES (?, ?)').run(name, value)
    reply.send({ success: true, id: info.lastInsertRowid })
  } catch (e) {
    reply.code(400).send({ success: false, error: e.message })
  }
})
```

- Tüm DB işlemleri `db.prepare().run/get/all()` ile yapılır
- `return` yerine `reply.send()` kullanılır (Fastify async route'larında her ikisi de çalışır ama `reply.send()` tercih edilir)
- `PRAGMA foreign_keys = ON` aktif, CASCADE kuralları şemada tanımlı

### DB Şeması Prensibi
- `CREATE TABLE IF NOT EXISTS` kullanılır
- Yeni kolon eklerken `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` veya uygulama başında `try/catch` ile denenir
- Schema migration yok — tek `db.js` içinde yönetilir

---

## Frontend (React / Vite)

### Component İmzası

```jsx
// memo + named export pattern
const MyPage = memo(() => {
  const user = useAuthStore(s => s.user)
  const items = useStore(s => s.items)

  useEffect(() => {
    useStore.getState().fetchItems()
    useDeviceStore.getState().fetchDevices() // gerekiyorsa diğer store'lar da çekilir
  }, [])

  return (...)
})

export default MyPage
```

### Inline Style Kullanımı

Projede **CSS class + inline style karışık** kullanılır:
- Layout, spacing, renk için inline `style={{}}` kabul edilir
- Reusable bileşenler için CSS sınıfları (`btn`, `card`, `input`, `flex`, `flex-col`, `gap-*`)
- Bu projeye özgü bir pratik olup değiştirilmemelidir

### Modal Tasarım Standardı

Tüm modal'lar şu yapıdadır:
```jsx
<div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:9999,
  display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' }}
  onClick={onClose}>
  <div onClick={e => e.stopPropagation()} className="card fade-in"
    style={{ width: 460, padding: 32, borderRadius: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
    {/* Header: title + X button */}
    {/* Form: grid 1fr 1fr layout */}
    {/* Footer: Cancel + Submit yan yana */}
  </div>
</div>
```

Label stili:
```jsx
<label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
```

Input stili:
```jsx
<input className="input w-full" style={{ padding: '12px 16px', borderRadius: 12 }} />
```

Button footer:
```jsx
<div className="flex gap-3" style={{ borderTop:'1px solid var(--border)', paddingTop: 28 }}>
  <button className="btn btn-ghost" style={{ flex:1, padding:'14px', justifyContent:'center',
    fontWeight:600, borderRadius:12 }}>Cancel</button>
  <button className="btn" style={{ flex:1, padding:'14px', justifyContent:'center', fontWeight:600,
    background:'#f59e0b', color:'#fff', border:'none', borderRadius:12,
    boxShadow:'0 4px 14px rgba(245,158,11,0.35)' }}>Submit</button>
</div>
```

### Kesinlikle Yasak

- `alert()`, `confirm()`, `prompt()` — yerine özel modal
- Loading state olmadan async buton — yerine `Loader2` spinner + disabled
- `devices: INITIAL_DEVICES` gibi hardcode mock data — yerine backend'den `fetchDevices()`
- Fake ID: `id: Date.now()` — yerine backend'den dönen `id`

### Icon Kütüphanesi

`lucide-react` — tüm ikonlar buradan gelir:
```jsx
import { Plus, Edit2, Trash2, Loader2, Wifi, Server, Database, ChevronUp, ChevronDown, X, Layers } from 'lucide-react'
```

---

## CSS Token'ları (var())

```css
var(--text-primary)      /* Ana metin */
var(--text-secondary)    /* İkincil metin */
var(--text-muted)        /* Hafif/gri */
var(--bg-primary)        /* Sayfa arka planı */
var(--bg-secondary)      /* Kart içi alternatif */
var(--border)            /* Kenar çizgisi */
var(--bg-hover)          /* Hover state */
```

---

## Renk Sistemi (Tutarlı Kullanım)

| Amaç | Renk |
|------|------|
| Cihaz / Birincil aksiyon | `#3b82f6` (mavi) |
| Tag / Uyarı | `#f59e0b` (amber) |
| Başarı / Bağlı | `#10b981` (yeşil) |
| Hata / Sil | `#ef4444` (kırmızı) |
| Pasif / Nötr | `#64748b` (slate) |
