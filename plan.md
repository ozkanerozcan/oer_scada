# SCADA Web Uygulaması - Teknik Plan v2

> **Son Güncelleme:** 2026-03-26
> Tüm gereksinimler netleştirilmiş, geliştirmeye hazır detaylı plan.

---

## Proje Özeti

| Özellik | Değer |
|---------|-------|
| **Sektör** | Üretim / Fabrika Otomasyonu |
| **Başlangıç Tag Sayısı** | Az (büyümeye açık, 500+'a kadar) |
| **Protokol** | Modbus TCP (öncelik), OPC UA / S7 PLC (gelecek) |
| **Özellikler** | İzleme, Kontrol, Alarm, Raporlama, Trend |
| **Eş Zamanlı Kullanıcı** | 1–5 |
| **Erişim** | Web (PWA + Responsive) |
| **Barındırma** | Local – Endüstriyel PC (Alpine Linux) |
| **Tasarım** | Modern Dashboard (multi-language, reusable components) |
| **Dil Desteği** | Türkçe / İngilizce (genişletilebilir i18n) |

---

## Ağ & Sistem Konfigürasyonu

| Parametre | Değer |
|-----------|-------|
| **İşletim Sistemi** | Alpine Linux |
| **API Port** | Konfigüre edilebilir (default: 3000) |
| **UI Port** | Konfigüre edilebilir (default: 5173) |
| **Modbus Cihaz IP** | Konfigüre edilebilir (çoklu cihaz desteği) |
| **Default Polling Interval** | 1000ms (UI üzerinden değiştirilebilir) |
| **Tarihsel Veri Saklama** | 7 gün (genişletilebilir) |
| **Trend Veri Çözünürlüğü** | 1 sn aralıklarla, son 7 gün |

---

## Teknoloji Stack

### Backend

| Katman | Teknoloji | Açıklama |
|--------|-----------|----------|
| **Runtime** | Node.js 20 LTS | Alpine Linux uyumlu, event-driven |
| **Framework** | Fastify | Hızlı REST API + Plugin ekosistemi |
| **Modbus** | modbus-serial | Çoklu cihaz, konfigüre edilebilir IP/port |
| **WebSocket** | @fastify/websocket | Native WS sunucusu (sıfır overhead) |
| **Veritabanı** | better-sqlite3 | Yerel, yüksek performanslı |
| **Auth** | fastify-jwt | JWT tabanlı kimlik doğrulama |
| **Process Mgr** | PM2 | Alpine Linux'ta daemon yönetimi |
| **Cache** | In-memory Map | Tag anlık değerleri |

### Frontend

| Katman | Teknoloji | Açıklama |
|--------|-----------|----------|
| **Framework** | React 19 + Vite | Hızlı build, HMR |
| **State** | Zustand | Minimal, performanslı global state |
| **UI** | TailwindCSS + Custom Components | Reusable component kütüphanesi |
| **Charting** | Recharts | Trend grafikleri |
| **i18n** | react-i18next | Türkçe / İngilizce + genişletilebilir |
| **PWA** | vite-plugin-pwa | Offline desteği |
| **Real-time** | Native WebSocket API | Tarayıcı native, sıfır bağımlılık |

---

## Mimari Yapı

```
┌──────────────────────────────────────────────────────────┐
│                    Alpine Linux PC                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   PLC/Cihaz-1 ──┐                                        │
│   PLC/Cihaz-2 ──┤──► Modbus TCP Driver                   │
│   PLC/Cihaz-N ──┘        │                               │
│                    ┌─────▼──────┐                        │
│                    │ Data Engine│ polling + cache         │
│                    └─────┬──────┘                        │
│          ┌───────────────┼────────────────┐              │
│          │               │                │              │
│   ┌──────▼─────┐  ┌──────▼──────┐  ┌─────▼──────┐       │
│   │ WebSocket  │  │  REST API   │  │  SQLite DB │       │
│   │  (RT Data) │  │  (Fastify)  │  │  (History) │       │
│   └──────┬─────┘  └──────┬──────┘  └────────────┘       │
│          └───────────────┴──────────────┐                │
│                                   ┌─────▼──────┐         │
│                                   │  React PWA │         │
│                                   │ (Tarayıcı) │         │
│                                   └────────────┘         │
└──────────────────────────────────────────────────────────┘
```

---

## Modbus Cihaz Yönetimi

- **Çoklu Cihaz**: Her cihazın IP, Port, Slave ID ayrı konfigüre edilir
- **Tag Grupları**: Alan bazlı gruplama — örn. `Pres-1`, `Pres-2`, `Konveyör-1`
- **Tag Türleri**:
  - Coil (okuma/yazma, dijital)
  - Discrete Input (sadece okuma, dijital)
  - Holding Register (okuma/yazma, analog)
  - Input Register (sadece okuma, analog)
- **Konfigürasyon**: UI üzerinden tag ekleme / düzenleme / silme
- **Polling**: Her cihaz için ayrı polling interval ayarlanabilir

---

## Kullanıcı ve Yetki Sistemi

| Rol | Yetki |
|-----|-------|
| **Misafir** (Giriş yok) | Sadece izleme – Dashboard, Trend, Tag listesi görüntüleme |
| **Operator** | Misafir + belirli tag'lere yazma (açma/kapatma) |
| **Supervisor** | Operator + alarm yönetimi, raporlar (netleşecek) |
| **Admin** | Tam yetki – Tag config, kullanıcı yönetimi, sistem ayarları |

- **Auth Yöntemi**: JWT (veritabanı tabanlı kullanıcı tablosu)
- **Oturum**: Token-based, refresh token desteği
- **Şifre**: bcrypt ile hashlenmiş

---

## Temel Modüller

### 1. Haberleşme Modülü
- **Modbus TCP Client**: Çoklu cihaz, bağlantı havuzu
- **Tag Mapper**: Register adres ↔ tag adı dönüşümü
- **Connection Manager**: Yeniden bağlanma, timeout yönetimi
- **Error Handler**: Cihaz hatalarını loglama ve UI'ya bildirme

### 2. Gerçek Zamanlı Veri Motoru
- **Data Collector**: Cihaz başına periyodik polling
- **In-Memory Cache**: `Map<tagId, {value, timestamp, quality}>`
- **WebSocket Hub**: Tüm bağlı client'lara diff bazlı yayın
- **Event Bus**: Alarm tetikleyiciler ve kural motoru

### 3. Veritabanı Katmanı
- **Tag Config**: Cihazlar, tag'ler, gruplar
- **Historical Data**: Zaman serisi (7 gün, auto-cleanup)
- **Alarm Log**: Alarm geçmişi ve onay kayıtları
- **User Table**: Kullanıcılar ve roller
- **Audit Log**: Yazma işlemleri kaydı

### 4. Web Arayüzü

#### Component Kütüphanesi (Reusable)
- **ValueCard**: Anlık değer kartı (sayısal/dijital, birim, renk durumu)
- **GaugeWidget**: Dairesel gösterge (min/max/alarm limitleri)
- **TrendChart**: Recharts tabanlı zaman serisi grafiği
- **AlarmBadge**: Alarm durumu göstergesi
- **ControlButton**: Açma/kapatma kontrol butonu (yetki kontrollü)
- **StatusIndicator**: Online/offline/alarm durumu

#### Sayfalar
- **Dashboard**: Özelleştirilebilir widget grid
- **Tag Browser**: Tag listesi, anlık değerler, arama/filtre
- **Tag Config**: Tag ekleme/düzenleme/silme (Admin)
- **Trends**: Çok tag'li grafik karşılaştırma
- **Alarms**: Aktif alarmlar, geçmiş, onaylama
- **Reports**: Zaman aralığı bazlı veri export (CSV/PDF)
- **Settings**: Sistem ayarları, kullanıcı yönetimi
- **Device Manager**: Modbus cihaz konfigürasyonu

---

## Proje Klasör Yapısı

```
oer-scada/
├── backend/
│   ├── src/
│   │   ├── config/           # Uygulama konfigürasyonu
│   │   │   ├── app.config.js
│   │   │   └── database.config.js
│   │   ├── modbus/           # Modbus haberleşme katmanı
│   │   │   ├── modbus-client.js
│   │   │   ├── device-manager.js
│   │   │   └── tag-mapper.js
│   │   ├── engine/           # Veri toplama motoru
│   │   │   ├── data-engine.js
│   │   │   ├── polling-scheduler.js
│   │   │   └── event-bus.js
│   │   ├── api/              # REST API endpoint'leri
│   │   │   ├── auth.routes.js
│   │   │   ├── tags.routes.js
│   │   │   ├── devices.routes.js
│   │   │   ├── alarms.routes.js
│   │   │   ├── history.routes.js
│   │   │   └── users.routes.js
│   │   ├── websocket/        # WebSocket yönetimi
│   │   │   └── ws-hub.js
│   │   ├── database/         # SQLite modelleri ve migration
│   │   │   ├── db.js
│   │   │   ├── migrations/
│   │   │   └── models/
│   │   ├── middleware/       # Auth, rate-limit, vb.
│   │   │   ├── auth.middleware.js
│   │   │   └── role.middleware.js
│   │   └── index.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI bileşenleri
│   │   │   ├── cards/
│   │   │   ├── charts/
│   │   │   ├── controls/
│   │   │   ├── layout/
│   │   │   └── common/
│   │   ├── pages/            # Sayfa bileşenleri
│   │   ├── stores/           # Zustand store modülleri
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API & WebSocket servis katmanı
│   │   ├── i18n/             # Çeviri dosyaları (tr, en)
│   │   ├── utils/            # Yardımcı fonksiyonlar
│   │   └── App.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .agent/
│   ├── skills/               # AI geliştirme yetenekleri
│   └── rules/                # Kod ve iş kuralları
└── README.md
```

---

## Geliştirme Aşamaları

### Faz 1 – Temel Altyapı
- [ ] Proje iskeleti (backend + frontend)
- [ ] SQLite veritabanı şeması ve migration
- [ ] JWT auth sistemi (login, token, refresh)
- [ ] Temel Fastify API yapısı

### Faz 2 – Modbus & Veri Motoru
- [ ] Çoklu Modbus cihaz yöneticisi
- [ ] Polling engine + in-memory cache
- [ ] WebSocket hub (gerçek zamanlı yayın)
- [ ] Tag CRUD API'leri

### Faz 3 – Frontend & UI
- [ ] Modern layout (Header + Sidebar + Main)
- [ ] i18n altyapısı (TR/EN)
- [ ] Reusable component kütüphanesi (ValueCard, Gauge, vb.)
- [ ] Dashboard sayfası
- [ ] Tag Browser sayfası

### Faz 4 – Kontrol & Alarm
- [ ] Yazma API'leri (coil/holding register)
- [ ] Rol bazlı kontrol UI
- [ ] Alarm tanımlama ve tetikleme motoru
- [ ] Alarm görüntüleme ve onaylama

### Faz 5 – Tarihsel Veri & Raporlama
- [ ] Zaman serisi kayıt + auto-cleanup (7 gün)
- [ ] Trend grafik sayfası
- [ ] Rapor oluşturma ve export (CSV)

### Faz 6 – PWA & Deployment
- [ ] PWA konfigürasyonu (vite-plugin-pwa)
- [ ] Alpine Linux deployment ayarları (PM2 + ecosystem.config)
- [ ] Ortam değişkenleri ve production build
- [ ] Kullanıcı yönetimi UI (Admin)

---

> Plan geliştirme sürecinde güncellenecektir. `.agent/` klasöründeki kurallar tüm geliştirme boyunca referans alınacaktır.