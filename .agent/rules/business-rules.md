# Kural: İş Kuralları

## Kullanıcı Rolleri ve Erişim

| Eylem | Misafir | Operator | Supervisor | Admin |
|-------|---------|----------|------------|-------|
| Dashboard görüntüleme | ✅ | ✅ | ✅ | ✅ |
| Tag değerlerini okuma | ✅ | ✅ | ✅ | ✅ |
| Trend görüntüleme | ✅ | ✅ | ✅ | ✅ |
| Alarm görüntüleme | ✅ | ✅ | ✅ | ✅ |
| Alarm onaylama | ❌ | ✅ | ✅ | ✅ |
| Tag'e değer yazma | ❌ | ✅* | ✅ | ✅ |
| Rapor alma | ❌ | ❌ | ✅ | ✅ |
| Tag konfigürasyonu | ❌ | ❌ | ❌ | ✅ |
| Cihaz yönetimi | ❌ | ❌ | ❌ | ✅ |
| Kullanıcı yönetimi | ❌ | ❌ | ❌ | ✅ |
| Sistem ayarları | ❌ | ❌ | ❌ | ✅ |

> *Operator yalnızca `writable: true` olan tag'lere yazabilir

---

## Yazma Güvenliği

- Tüm tag yazma işlemleri `audit_log` tablosuna kaydedilir
- Kritik yazma işlemleri (güvenlik çıkışları vb.) UI'da onay dialogu gerektirir
- Yazma işleminde tag `writable: false` ise 403 verilir
- Yazma değeri `[alarm_low, alarm_high]` aralığı dışındaysa uyarı gösterilir (engel değil)

---

## Alarm Kuralları

### Tetiklenme
- `değer > alarm_high` → HIGH alarm tetiklenir
- `değer < alarm_low` → LOW alarm tetiklenir
- Cihaz bağlantısı > 30 sn kopuksa → COMM_ERROR alarmı
- Aynı tag için aynı anda tek aktif alarm (tekrar tetikleme spam koruması)

### Onay (ACK)
- Operatör ve üzeri roller onaylayabilir
- Onaylanmamış alarmlar header'da yanıp söner
- Alarm açıldıktan sonra otomatik kapanır (değer normale dönünce)

### Alarm Seviyeleri
| Seviye | Renk | Ses |
|--------|------|-----|
| `warning` | Sarı | İsteğe bağlı |
| `critical` | Kırmızı | İsteğe bağlı |

---

## Tarihsel Veri Saklama

- **Saklama Süresi**: 7 gün
- **Çözünürlük**: 1 sn (polling interval)
- **Auto-Cleanup**: Her gece 00:00'da 7 günden eski kayıtlar silinir
- **Export**: CSV formatı (Supervisor ve Admin)
- **Veri yoğunluğu**: ~7 gün × 86400 kayıt/tag → büyük tablolar için index zorunlu

---

## Modbus Yazma Güvenlik Kuralları

- Yazma işlemi öncesinde tag tipi kontrol edilir: `coil` veya `holding_register` olmalı
- Değer aralığı kontrol edilir:
  - Coil: `true` / `false`
  - Holding Register: `0 – 65535` (raw) veya scale uygulanmışsa engineering değeri
- Ham adres doğrudan yazılmaz; sadece `tagId` üzerinden yazma yapılır

---

## Polling Davranışı

- Polling aktif cihazlar için başlatılır (`device.enabled = true`)
- Tag `enabled = false` ise polling listesinden çıkar
- Polling interval en az 200ms olabilir (UI'da kısıtlanır)
- Cihaz eklendiğinde/silindiğinde polling engine'i yeniden başlatmaya gerek yoktur;
  cihaz runtime'da eklenir/çıkarılır

---

## i18n Kuralları

- Arayüz varsayılan dili: Türkçe (`tr`)
- Dil seçimi localStorage'da saklanır
- Çeviri anahtarları namespace'li: `common.save`, `tags.addNew`, `alarms.noActive`
- Tag `display_name` alanı JSON: `{"tr": "...", "en": "..."}`
- Eksik çeviri anahtarı İngilizce fallback kullanır
