# Hotel Booking Frontend Applications

Bu klasör, Hotel Booking sistemi için iki ayrı React uygulaması içermektedir:

## 📁 Yapı

```
frontend/
├── admin-dashboard/    # Admin Dashboard (admin.hotels.com)
└── client-app/         # Client Booking App (hotels.com)
```

---

## 🔐 Admin Dashboard

**Hedef Kitle:** Otel yöneticileri

### Özellikler

- ✅ Email/Password ve Google ile giriş (Firebase Auth)
- ✅ Otel ve oda yönetimi
- ✅ Müsaitlik yönetimi (tarih aralığı, oda sayısı, fiyat)
- ✅ ML tabanlı fiyat tahmini
- ✅ Profesyonel ve veri odaklı UI

### Kurulum

```bash
cd frontend/admin-dashboard
npm install
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

### Ortam Değişkenleri

`.env` dosyası oluşturun:

```env
VITE_API_URL=https://your-api-gateway-url.com
```

---

## 🏨 Client Booking App

**Hedef Kitle:** Genel kullanıcılar / Gezginler

### Özellikler

- ✅ Otel arama (destinasyon, tarih, kişi sayısı)
- ✅ %10 üye indirimi (giriş yapan kullanıcılar için)
- ✅ Harita görünümü (Leaflet.js)
- ✅ Otel detay sayfası
- ✅ Online rezervasyon
- ✅ Rezervasyon takibi
- ✅ Hotels.com benzeri modern UI

### Kurulum

```bash
cd frontend/client-app
npm install
npm run dev
```

Uygulama `http://localhost:3001` adresinde çalışacaktır.

### Ortam Değişkenleri

`.env` dosyası oluşturun:

```env
VITE_API_URL=https://your-api-gateway-url.com
```

---

## 🔥 Firebase Yapılandırması

Her iki uygulama da aynı Firebase projesini kullanmaktadır:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAHlqz-knEiIo9wKXrkLZiNbTZAdJiqxXA",
  authDomain: "hotel-booking-system-final.firebaseapp.com",
  projectId: "hotel-booking-system-final",
  storageBucket: "hotel-booking-system-final.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

⚠️ `messagingSenderId` ve `appId` değerlerini Firebase Console'dan alın.

---

## 🚀 Production Build

### Admin Dashboard

```bash
cd frontend/admin-dashboard
npm run build
```

### Client App

```bash
cd frontend/client-app
npm run build
```

Build çıktıları `dist/` klasöründe oluşacaktır.

---

## 📡 API Endpoints

Her iki uygulama da API Gateway üzerinden backend servislerine bağlanır:

### Client App

- `GET /api/v1/search/hotels` - Otel arama
- `GET /api/v1/search/hotels/:id` - Otel detayları
- `POST /api/v1/bookings` - Rezervasyon oluştur
- `GET /api/v1/bookings` - Kullanıcı rezervasyonları
- `PUT /api/v1/bookings/:id/cancel` - Rezervasyon iptali

### Admin Dashboard

- `GET /api/v1/hotels` - Otel listesi
- `GET /api/v1/rooms` - Oda listesi
- `POST /api/v1/availability` - Müsaitlik güncelle
- `GET /api/v1/price/predict` - ML fiyat tahmini

---

## 🎨 Kullanılan Teknolojiler

- **React 18** - UI framework
- **React Router v6** - Routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Firebase SDK** - Authentication
- **Leaflet.js** - Harita (Client App)
- **date-fns** - Tarih işlemleri
- **react-hot-toast** - Bildirimler
- **Vite** - Build tool

---

## 📝 Notlar

1. **Admin Yetkisi:** Admin dashboard'a erişmek için kullanıcının veritabanında `role: 'ADMIN'` olarak işaretlenmesi gerekir.

2. **Üye İndirimi:** Giriş yapan tüm kullanıcılar otomatik olarak %10 indirim görür. Bu indirim backend tarafından da uygulanır.

3. **CORS:** Production'da API Gateway'in frontend domain'lerine CORS izni vermesi gerekir.
