# Skill: User Management (Kullanıcı Yönetimi)

## Amaç
SCADA/HMI uygulamasında yetkilendirme (Role-Based Access Control) ve kullanıcı yönetiminin nasıl yapılacağını tanımlar.

---

## Yetki Seviyeleri (Roller)

```javascript
const ROLES = {
  ADMIN: 'admin',             // Tam erişim, tüm kullanıcı tiplerini yönetebilir
  SUPERVISOR: 'supervisor',   // Sınırlı yönetim, sadece operatör ekleyebilir
  OPERATOR: 'operator',       // İzleme ve kontrol yetkileri
  GUEST: 'guest'              // Hiç giriş yapılmadığında atanan varsayılan rol
};
```

### Rol Tabanlı Erişim Kuralları
- **Admin**: `admin`, `supervisor` veya `operator` rollerinde yeni kullanıcılar ekleyebilir ve yönetebilir.
- **Supervisor**: Sadece `operator` rolünde yeni kullanıcılar ekleyebilir ve yönetebilir.
- **Sayfa Erişimi (`src/pages/Users.jsx`)**: Kullanıcı yönetim sayfasına yalnızca `admin` veya `supervisor` rolüne sahip kişiler erişebilir. Diğer roller (operator, guest) Dashboard'a yönlendirilir veya "Yetkisiz Erişim" mesajı görür.

## Sayfa Yapısı (`src/pages/Users.jsx`)

Kullanıcı yönetim sayfası sadece `admin` veya `supervisor` rolüne sahip kullanıcılar tarafından görüntülenebilir. Aksi takdirde "Yetkisiz Erişim" sayfası veya dashboard'a yönlendirme yapılır.

### Temel Özellikler
- **Liste Görünümü:** Sistemdeki tüm kullanıcıların tablosu (Ad, Kullanıcı Adı, Rol, Durum).
- **CRUD İşlemleri:** Yeni kullanıcı ekleme, mevcut kullanıcıyı düzenleme, şifre sıfırlama ve silme.
- **Modal Formlar:** Ekleme ve düzenleme işlemleri standart modal bileşenleri kullanılarak yapılır (`ui-components.md` referans alınarak).
- **Teal Theme:** Tema uyumluluğu için `--color-accent` vb değişkenler kullanılır.

## Component Kullanım Örneği

```jsx
<Button variant="primary" onClick={openAddUserModal}>
  <Plus size={16} className="mr-2" />
  Yeni Kullanıcı
</Button>
```

Tüm işlemler arka planda Zustand tabanlı global store (örn. `useAuthStore`) ile senkronize edilir.
