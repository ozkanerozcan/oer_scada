# Skill: UI Component Kütüphanesi

## Amaç
Reusable, tutarlı ve modern bir SCADA arayüzü için component geliştirme
standartlarını, tasarım dilini ve kullanım şablonlarını tanımlar.

---

## Tasarım Sistemi

### Renk Paleti
```css
/* Tema renkleri — globals.css veya tailwind.config.js */
--color-bg-primary:    #0f1117;  /* Ana arka plan */
--color-bg-secondary:  #1a1d27;  /* Kart, panel arka planı */
--color-bg-tertiary:   #242736;  /* Hover, input arka planı */
--color-border:        #2e3347;  /* Sınır rengi */

--color-accent:        #3b82f6;  /* Birincil vurgu (mavi) */
--color-accent-hover:  #2563eb;
--color-success:       #22c55e;  /* OK / Normal */
--color-warning:       #f59e0b;  /* Uyarı alarmı */
--color-danger:        #ef4444;  /* Kritik alarm */
--color-muted:         #6b7280;  /* Pasif metin */

--color-text-primary:  #f1f5f9;
--color-text-secondary:#94a3b8;
```

### Tipografi
- Font: `Inter` (Google Fonts)
- Sayısal değerler için: `font-variant-numeric: tabular-nums`

---

## Temel Component'ler

### ValueCard
Bir tag'in anlık değerini gösterir.

```jsx
// Props
{
  tag: TagConfig,         // Tag konfigürasyonu
  value: TagValue,        // Anlık değer
  size: 'sm' | 'md' | 'lg',
  showUnit: boolean,
  showTimestamp: boolean,
  onClick: () => void     // Opsiyonel — trend sayfasına git
}
```

**Görsel Kurallar:**
- Normal: `--color-success` border-left accent
- Uyarı (alarm eşiği aşıldı): `--color-warning` + yanıp sönen dot
- Kritik: `--color-danger` + kırmızı arka plan tonu
- Offline/Bad quality: `--color-muted` + "—" değer gösterimi

### GaugeWidget
Dairesel/yarım daire gösterge.

```jsx
{
  tag: TagConfig,
  value: number,
  min: number,
  max: number,
  unit: string,
  zones: [
    { from: 0, to: 60, color: 'success' },
    { from: 60, to: 80, color: 'warning' },
    { from: 80, to: 100, color: 'danger' }
  ]
}
```

### TrendChart
Recharts tabanlı zaman serisi grafiği.

```jsx
{
  tagIds: string[],       // Karşılaştırmalı multi-tag
  timeRange: '1h' | '6h' | '24h' | '7d' | 'custom',
  height: number,
  showLegend: boolean
}
```

### ControlButton
Coil/Holding Register'a yazma butonu.

```jsx
{
  tag: TagConfig,
  currentValue: boolean,
  onToggle: (value) => void,
  requireConfirm: boolean,    // Onay dialogu
  disabled: boolean           // Yetki kontrolü
}
```

### StatusBadge
Cihaz / bağlantı durumu.

```jsx
{
  status: 'connected' | 'disconnected' | 'error' | 'polling',
  label: string,
  showPulse: boolean
}
```

### AlarmBadge
Aktif alarm sayısı.

```jsx
{
  count: number,
  severity: 'warning' | 'critical',
  onClick: () => void
}
```

### CustomSelect
Tüm forma ve sayfalara yayılan modern dropdown bileşeni. Native `<select>` yerine kullanılır.

```jsx
{
  value: any,
  onChange: (value) => void,
  options: [{ label: string, value: any }],
  placeholder?: string,
  disabled?: boolean
}
```

### SegmentedToggle
İki veya şık sınırlı seçenekli durumlar için (Aktif/Pasif, Oku/Yaz) kullanılan yatay buton grubu. İki seçenekli durumlarda CustomSelect veya native select yerine KESİNLİKLE bu bileşen kullanılmalıdır.

```jsx
{
  value: any,
  onChange: (value) => void,
  options: [{ label: string, value: any, color?: string, shadow?: string }]
}
```

---

## Layout Yapısı

```
┌──────────────────────────────────┐
│           TopHeader              │  Fixed, h-14
│  Logo | Breadcrumb | Alarms | Lang | User
├──────┬───────────────────────────┤
│      │                           │
│ Side │      Main Content         │
│ bar  │                           │
│      │  <page component />       │
│ w-56 │                           │
│      │                           │
└──────┴───────────────────────────┘
```

- Sidebar: Collapsible (icon-only mode mobile/tablet)
- Header: Sabit kalır, scroll'dan etkilenmez
- Main: `overflow-y-auto`, `p-6`

---

## Form & Input Kuralları
1. **Grid Hizalaması:** Form modallarında yan yana hizalanan input grupları için (örneğin IP ve Port) `flex` yerine kesinlikle `style={{ display: 'grid', gridTemplateColumns: '70% 1fr', gap: 20 }}` gibi Grid yapıları kullanılmalıdır. Bu sayede tüm satırların uçları mükemmel hizalanır.
2. **Dropdown Kullanımı:** Asla native `<select>` kullanılmaz. Mutlaka `@/components/CustomSelect` kullanılmalıdır. Bu bileşen, özel CSS ve Lucide ikonlarıyla modern bir his verir.
3. **Durum Seçiciler (Toggles):** Aktif/Pasif gibi iki durumlu seçimler için sıradan dropdown'lar **KESİNLİKLE KULLANILMAMALIDIR**. Bunun yerine modern, buton tabanlı "Segmented Control" (Toggle) mekanizmaları inşa edilmelidir. (Bkz: `Devices.jsx` form durumu)
4. **Dokümantasyon Senkronizasyonu (Agent Kuralı):** Sisteme yeni bir UI davranışı (yeni bir animasyon, form hizalama kuralı vb.) eklendiğinde, Agent bu `ui-components.md` dosyasını derhal **otomatik olarak** güncelleyecektir. Kullanıcının bunu hatırlatmasına gerek yoktur.

---

## i18n Kullanımı

```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('dashboard.title')}</h1>;
}
```

Çeviri anahtarları düz İngilizce nokta notasyonuyla:
- `dashboard.title`, `tags.addTag`, `alarms.noActive`

---

## Component Yazma Kuralları

1. Her component kendi klasöründe: `components/cards/ValueCard/index.jsx`
2. Props TypeScript-style JSDoc ile belgelenir
3. Inline style yasak — sadece Tailwind class veya CSS değişkenleri (özel Grid align durumları haricinde mantıklı kullanılmalı)
4. Her component `React.memo` ile sarılır (performans)
5. Store'dan sadece gerekli slice okunur (Zustand selector)
6. Loading ve error state'leri her component'te ele alınır
7. **NATIVE DIALOG YASAĞI (🚨 ÖNEMLİ):** Projenin HİÇBİR yerinde tarayıcının native `alert()`, `confirm()` veya `prompt()` fonksiyonları kullanılmayacaktır. Uyarı, onay ve hata mesajları için mutlaka özel Modern UI Modalları tasarlanacaktır. Eğer eski bir kodda rastlanırsa derhal özel React modal yapısıyla değiştirilecek ve state ('örn. `pingResult` veya `deleteConfirmDevice`') üzerinden tetiklenecektir.
8. **YÜKLEME (LOADING) GERİ BİLDİRİMİ İLKESİ:** Network üzerinden veya asenkron yürütülen (1 saniyeden uzun sürebilecek) tüm işlevlerde (Ping atma, form kaydetme, veri çekme vb.), butonda anında `lucide-react`'in `Loader2` (animate-spin) vb. ikonlarıyla görsel yükleme durumu (loading state) tetiklenmeli ve işlem süresince diğer ilgili butonlar `disabled` konumuna çekilerek tıklamalar engellenmelidir.
