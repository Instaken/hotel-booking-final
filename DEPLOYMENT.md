# Backend Servisleri Cloud Run Deployment Rehberi

Bu rehber, Hotel Booking backend servislerini Google Cloud Run'a deploy etme adımlarını içerir.

## 📋 Ön Gereksinimler

1. Google Cloud CLI kurulu olmalı
2. Docker kurulu olmalı
3. Google Cloud projeniz oluşturulmuş olmalı

## 🔐 Veritabanı Bilgileri (NeonDB)

```
admin_db:        postgresql://Admin:npg_JQDd3HSz6jWr@ep-old-haze-ag1a6v7o-pooler.c-2.eu-central-1.aws.neon.tech/admin_db?sslmode=require
client_db:       postgresql://Admin:npg_JQDd3HSz6jWr@ep-old-haze-ag1a6v7o-pooler.c-2.eu-central-1.aws.neon.tech/client_db?sslmode=require
notification_db: postgresql://Admin:npg_JQDd3HSz6jWr@ep-old-haze-ag1a6v7o-pooler.c-2.eu-central-1.aws.neon.tech/notification_db?sslmode=require
```

---

## 🚀 Adım 1: Google Cloud Ayarları

```bash
# Projeyi ayarla
gcloud config set project hotel-booking-system-final

# Gerekli API'leri etkinleştir
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Region ayarla (Türkiye'ye yakın)
REGION="europe-west1"
PROJECT_ID="hotel-booking-system-final"
```

---

## 🔑 Adım 2: Secret Manager'da Veritabanı URL'lerini Oluştur

```bash
# Admin DB URL
echo -n "postgresql://Admin:npg_JQDd3HSz6jWr@ep-old-haze-ag1a6v7o-pooler.c-2.eu-central-1.aws.neon.tech/admin_db?sslmode=require" | \
gcloud secrets create admin-db-url --data-file=-

# Client DB URL
echo -n "postgresql://Admin:npg_JQDd3HSz6jWr@ep-old-haze-ag1a6v7o-pooler.c-2.eu-central-1.aws.neon.tech/client_db?sslmode=require" | \
gcloud secrets create client-db-url --data-file=-

# Notification DB URL
echo -n "postgresql://Admin:npg_JQDd3HSz6jWr@ep-old-haze-ag1a6v7o-pooler.c-2.eu-central-1.aws.neon.tech/notification_db?sslmode=require" | \
gcloud secrets create notification-db-url --data-file=-
```

---

## 📦 Adım 3: ML Service Deploy

```bash
cd backend/ml-service

# Build ve deploy (tek komutla)
gcloud run deploy ml-service \
    --source . \
    --region europe-west1 \
    --platform managed \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 3 \
    --set-env-vars "PORT=8080,MODEL_PATH=/app/models"

# URL'i kaydet
ML_SERVICE_URL=$(gcloud run services describe ml-service --region europe-west1 --format 'value(status.url)')
echo "ML Service URL: $ML_SERVICE_URL"

cd ../..
```

---

## 📦 Adım 4: Admin Service Deploy

```bash
cd backend/admin-service

# Deploy
gcloud run deploy admin-service \
    --source . \
    --region europe-west1 \
    --platform managed \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 5 \
    --set-env-vars "PORT=8080,NODE_ENV=production,LOG_LEVEL=info,GOOGLE_CLIENT_ID=hotel-booking-system-final,ML_SERVICE_URL=${ML_SERVICE_URL}" \
    --set-secrets "DATABASE_URL=admin-db-url:latest"

# URL'i kaydet
ADMIN_SERVICE_URL=$(gcloud run services describe admin-service --region europe-west1 --format 'value(status.url)')
echo "Admin Service URL: $ADMIN_SERVICE_URL"

cd ../..
```

---

## 📦 Adım 5: Client Service Deploy

```bash
cd backend/client-service

# Deploy
gcloud run deploy client-service \
    --source . \
    --region europe-west1 \
    --platform managed \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --set-env-vars "PORT=8080,NODE_ENV=production,LOG_LEVEL=info,GOOGLE_CLIENT_ID=hotel-booking-system-final,GOOGLE_PROJECT_ID=hotel-booking-system-final" \
    --set-secrets "DATABASE_URL=client-db-url:latest"

# URL'i kaydet
CLIENT_SERVICE_URL=$(gcloud run services describe client-service --region europe-west1 --format 'value(status.url)')
echo "Client Service URL: $CLIENT_SERVICE_URL"

cd ../..
```

---

## 📦 Adım 6: Notification Service Deploy

```bash
cd backend/notification-service

# Deploy
gcloud run deploy notification-service \
    --source . \
    --region europe-west1 \
    --platform managed \
    --allow-unauthenticated \
    --memory 256Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 3 \
    --set-env-vars "PORT=8080,NODE_ENV=production,LOG_LEVEL=info,GOOGLE_PROJECT_ID=hotel-booking-system-final" \
    --set-secrets "DATABASE_URL=notification-db-url:latest"

# URL'i kaydet
NOTIFICATION_SERVICE_URL=$(gcloud run services describe notification-service --region europe-west1 --format 'value(status.url)')
echo "Notification Service URL: $NOTIFICATION_SERVICE_URL"

cd ../..
```

---

## ✅ Adım 7: Test Et

```bash
# Health check - ML Service
curl $ML_SERVICE_URL/health

# Health check - Admin Service
curl $ADMIN_SERVICE_URL/health

# Health check - Client Service
curl $CLIENT_SERVICE_URL/health

# Health check - Notification Service
curl $NOTIFICATION_SERVICE_URL/health
```

---

## 📝 Tüm Service URL'lerini Göster

```bash
echo "========================================"
echo "Deployed Services:"
echo "========================================"
echo "ML Service:           $ML_SERVICE_URL"
echo "Admin Service:        $ADMIN_SERVICE_URL"
echo "Client Service:       $CLIENT_SERVICE_URL"
echo "Notification Service: $NOTIFICATION_SERVICE_URL"
echo "========================================"
```

---

## 🔄 Güncelleme Yapmak İsterseniz

Herhangi bir servisi güncellemek için aynı deploy komutunu tekrar çalıştırın:

```bash
cd backend/admin-service
gcloud run deploy admin-service --source . --region europe-west1
```

---

## 🗄️ Veritabanı Tablolarını Oluşturma

NeonDB'de tabloları oluşturmak için migration dosyalarını çalıştırın:

```bash
# NeonDB'ye bağlan ve SQL dosyalarını çalıştır
# database/migrations/ klasöründeki dosyaları sırasıyla çalıştırın

# 1. Admin DB için
psql "postgresql://Admin:npg_JQDd3HSz6jWr@ep-old-haze-ag1a6v7o-pooler.c-2.eu-central-1.aws.neon.tech/admin_db?sslmode=require" -f database/migrations/001_admin_db_schema.sql

# 2. Client DB için
psql "postgresql://Admin:npg_JQDd3HSz6jWr@ep-old-haze-ag1a6v7o-pooler.c-2.eu-central-1.aws.neon.tech/client_db?sslmode=require" -f database/migrations/002_client_db_schema.sql

# 3. Notification DB için
psql "postgresql://Admin:npg_JQDd3HSz6jWr@ep-old-haze-ag1a6v7o-pooler.c-2.eu-central-1.aws.neon.tech/notification_db?sslmode=require" -f database/migrations/003_notification_db_schema.sql
```

---

## 🐛 Sorun Giderme

### Logs Görüntüleme

```bash
gcloud run logs read admin-service --region europe-west1 --limit 50
gcloud run logs read client-service --region europe-west1 --limit 50
```

### Secret Erişim İzni

```bash
# Cloud Run service account'a secret erişimi ver
gcloud secrets add-iam-policy-binding admin-db-url \
    --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### Servisi Silme

```bash
gcloud run services delete admin-service --region europe-west1
```
