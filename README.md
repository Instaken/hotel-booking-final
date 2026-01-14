# 🏨 Hotel Booking System

A comprehensive, cloud-native hotel booking platform built with microservices architecture, deployed on Google Cloud Platform.

![Architecture](https://img.shields.io/badge/Architecture-Microservices-blue)
![Cloud](https://img.shields.io/badge/Cloud-Google%20Cloud%20Platform-orange)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Python-green)
![Database](https://img.shields.io/badge/Database-PostgreSQL-336791)
![ML](https://img.shields.io/badge/ML-Dynamic%20Pricing-red)

---

## 📋 Table of Contents

- [Live Demo URLs](#-live-demo-urls)
- [Project Video](#-project-video)
- [System Architecture](#-system-architecture)
- [Design Decisions](#-design-decisions)
- [Assumptions](#-assumptions)
- [Issues Encountered](#-issues-encountered)
- [Data Models](#-data-models)
- [Technology Stack](#-technology-stack)
- [Features](#-features)
- [API Documentation](#-api-documentation)
- [Local Development](#-local-development)
- [Deployment](#-deployment)

---

## 🌐 Live Demo URLs

### Frontend Applications

Did not deployed only for local.

### Backend Services

| Service                  | URL                                                              | Description             |
| ------------------------ | ---------------------------------------------------------------- | ----------------------- |
| **API Gateway**          | `https://hotel-booking-gateway-8n6yll8a.ew.gateway.dev`          | Unified API entry point |
| **Admin Service**        | `https://admin-service-677400217786.europe-west3.run.app`        | Hotel & room management |
| **Client Service**       | `https://client-service-677400217786.europe-west3.run.app`       | Search & bookings       |
| **ML Service**           | `https://ml-service-677400217786.europe-west3.run.app`           | Dynamic pricing         |
| **Notification Service** | `https://notification-service-677400217786.europe-west3.run.app` | Email notifications     |

> ⚠️ **Note**: Please replace the `XXXXX` placeholders with your actual Firebase Hosting URLs after deployment.

---

## 🎥 Project Video

📺 **[Watch the Project Presentation Video (Max 5 minutes)](https://drive.google.com/file/d/1AmdDvZF6bztkS_0x96fVLXmQtERzfmWR/view?usp=drive_link)**

> Replace `YOUR_VIDEO_LINK_HERE` with your actual video link (YouTube, Loom, Google Drive, etc.)

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                  │
│  ┌─────────────────────────┐         ┌─────────────────────────┐            │
│  │     Client App          │         │    Admin Dashboard      │            │
│  │   (React + Vite)        │         │    (React + Vite)       │            │
│  │   Firebase Hosting      │         │    Firebase Hosting     │            │
│  └───────────┬─────────────┘         └───────────┬─────────────┘            │
└──────────────┼───────────────────────────────────┼──────────────────────────┘
               │                                   │
               └─────────────┬─────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │           Google Cloud API Gateway (Endpoints)                       │    │
│  │      • Firebase Authentication (JWT Validation)                      │    │
│  │      • Request Routing                                               │    │
│  │      • CORS Handling                                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────┐         ┌───────────────┐          ┌───────────────┐
│ Admin Service │         │ Client Service│          │ ML Service    │
│ (Node.js)     │         │ (Node.js)     │          │ (Python/Flask)│
│ Cloud Run     │         │ Cloud Run     │          │ Cloud Run     │
└───────┬───────┘         └───────┬───────┘          └───────────────┘
        │                         │
        │                         │ ──────────────┐
        │                         │               ▼
        │                         │      ┌───────────────┐
        │                         │      │Notification   │
        │                         │      │Service        │
        │                         │      │(Node.js)      │
        │                         │      │Cloud Run      │
        │                         │      └───────┬───────┘
        │                         │              │
        ▼                         ▼              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA & MESSAGING LAYER                              │
│                                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐      │
│  │ Admin DB    │   │ Client DB   │   │Notification │   │   Redis     │      │
│  │(PostgreSQL) │   │(PostgreSQL) │   │     DB      │   │MemoryStore │      │
│  │ Cloud SQL   │   │ Cloud SQL   │   │(PostgreSQL) │   │  (Cache)    │      │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘      │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │              Google Cloud Pub/Sub                                    │    │
│  │      Topic: new-reservations (Async notification delivery)           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Architecture Flow

1. **User Authentication**: Firebase Authentication handles Google Sign-In for both clients and admins
2. **API Gateway**: All requests route through Google Cloud API Gateway for JWT validation and routing
3. **Service Communication**:
   - Admin Service → Manages hotels, rooms, availability, and pricing
   - Client Service → Handles search and booking operations
   - ML Service → Provides dynamic pricing predictions
   - Notification Service → Sends email confirmations via Pub/Sub
4. **Data Sync**: Admin database changes sync to Client database for read optimization
5. **Caching**: Redis caches frequently accessed data (hotels, search results)

---

## 🎨 Design Decisions

### 1. **Microservices Architecture**

- **Reason**: Separation of concerns, independent scaling, and technology flexibility
- **Implementation**: 4 separate services with clear boundaries
  - Admin Service (Node.js) - CRUD operations for hotel management
  - Client Service (Node.js) - Customer-facing operations
  - ML Service (Python/Flask) - Price predictions using scikit-learn
  - Notification Service (Node.js) - Async email delivery

### 2. **Database Per Service (Polyglot Persistence)**

- **Admin DB**: Master database for hotel/room data
- **Client DB**: Read replica with booking table for faster searches
- **Notification DB**: Stores notification history and templates
- **Reason**: Service isolation, optimized schemas per use case

### 3. **Event-Driven Notifications**

- **Technology**: Google Cloud Pub/Sub
- **Topic**: `new-reservations`
- **Reason**: Decouples booking from notification, ensures reliable delivery

### 4. **API Gateway Pattern**

- **Technology**: Google Cloud Endpoints
- **Features**: JWT validation, rate limiting, CORS
- **Reason**: Centralized authentication, unified API surface

### 5. **Dynamic Pricing with ML**

- **Model**: Random Forest Regressor
- **Features**: City, star rating, room type, seasonality, weekend/holiday
- **Training Data**: Historical booking data (hotel_booking.csv)
- **Reason**: Optimize revenue based on demand patterns

### 6. **Caching Strategy**

- **Technology**: Redis (Google Cloud Memorystore)
- **Cached Data**: Hotel listings, search results, availability
- **TTL**: 5 minutes for dynamic data, 1 hour for static
- **Reason**: Reduce database load, improve response times

### 7. **Authentication**

- **Provider**: Firebase Authentication
- **Method**: Google Sign-In (OAuth 2.0)
- **Admin Detection**: Based on `role` field in users table
- **Reason**: Easy integration, secure, no password management

---

## 📝 Assumptions

### Business Assumptions

1. **Single Currency**: All prices are in EUR
2. **User Roles**: Only two roles - USER and ADMIN
3. **Booking Flow**: Book now, pay later (no payment integration)
4. **Cancellation**: Users can cancel bookings; availability is restored
5. **Admin Scope**: Each admin manages their own hotels only

### Technical Assumptions

1. **Google Account Required**: All users authenticate via Google
2. **Email Delivery**: Users have valid email addresses for notifications
3. **Timezone**: All dates stored in UTC
4. **Image Storage**: Hotel/room images stored as URLs (external hosting)
5. **Single Region**: All services deployed in `europe-west3`

### Data Assumptions

1. **Room Availability**: Each room type has daily inventory count
2. **Pricing**: Base price can be overridden by ML predictions
3. **Discount**: Registered users receive 10% discount on bookings
4. **Capacity Alerts**: Triggered when availability < 20%

---

## ⚠️ Issues Encountered

### 1. **CORS Configuration Complexity**

- **Problem**: Preflight requests failing between Firebase-hosted frontend and Cloud Run services
- **Solution**: Implemented OPTIONS handlers in API Gateway spec and added `x-google-allow: all` in OpenAPI spec

### 2. **Pub/Sub Message Acknowledgment**

- **Problem**: Duplicate notifications being sent due to unacknowledged messages
- **Solution**: Implemented proper try-catch with `message.ack()` on success and `message.nack()` for retry

### 3. **Redis Connection in Cloud Run**

- **Problem**: Cloud Run cold starts caused Redis connection timeouts
- **Solution**: Implemented connection retry logic and VPC connector for private IP access

### 4. **Firebase Token Validation**

- **Problem**: API Gateway couldn't validate Firebase tokens initially
- **Solution**: Configured `x-google-issuer` and `x-google-jwks_uri` correctly in OpenAPI spec

### 5. **ML Model Size**

- **Problem**: Large model file caused slow Cloud Run cold starts
- **Solution**: Optimized model, reduced features, used joblib compression

### 6. **Database Connection Pooling**

- **Problem**: "Too many connections" error under load
- **Solution**: Implemented connection pooling with max 20 connections per service

### 7. **Cross-Database Sync**

- **Problem**: Keeping Admin DB and Client DB in sync
- **Solution**: Implemented sync endpoints called after admin operations

### 8. **Time Zone Handling**

- **Problem**: Date mismatches between frontend and backend
- **Solution**: Standardized on ISO 8601 format with UTC timezone

---

## 📊 Data Models

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ADMIN DATABASE (admin_db)                              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
│       USERS         │       │       HOTELS        │       │        ROOMS        │
├─────────────────────┤       ├─────────────────────┤       ├─────────────────────┤
│ • id (UUID) PK      │       │ • id (UUID) PK      │       │ • id (UUID) PK      │
│ • google_id         │       │ • name              │       │ • hotel_id FK       │──┐
│ • email             │◄──────│ • admin_id FK       │       │ • name              │  │
│ • name              │       │ • description       │       │ • description       │  │
│ • picture           │       │ • address           │       │ • room_type         │  │
│ • phone             │       │ • city              │       │ • capacity          │  │
│ • role (USER/ADMIN) │       │ • country           │       │ • base_price        │  │
│ • created_at        │       │ • latitude          │       │ • size_sqm          │  │
│ • updated_at        │       │ • longitude         │       │ • amenities (JSON)  │  │
└─────────────────────┘       │ • star_rating       │       │ • images (JSON)     │  │
                              │ • amenities (JSON)  │       │ • is_active         │  │
                              │ • images (JSON)     │       │ • created_at        │  │
                              │ • is_active         │       │ • updated_at        │  │
                              │ • created_at        │       └──────────┬──────────┘  │
                              │ • updated_at        │                  │             │
                              └──────────┬──────────┘                  │             │
                                         │                             │             │
                                         │                             ▼             │
                                         │            ┌─────────────────────┐        │
                                         │            │  ROOM_AVAILABILITY  │        │
                                         │            ├─────────────────────┤        │
                                         │            │ • id (UUID) PK      │        │
                                         └───────────►│ • room_id FK        │◄───────┘
                                                      │ • date              │
                                                      │ • available_count   │
                                                      │ • price             │
                                                      │ • created_at        │
                                                      │ • updated_at        │
                                                      └─────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT DATABASE (client_db)                            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
│       USERS         │       │      BOOKINGS       │       │   ROOMS (replica)   │
├─────────────────────┤       ├─────────────────────┤       ├─────────────────────┤
│ • id (UUID) PK      │◄──────│ • user_id FK        │       │    (Same as above)  │
│ • google_id         │       │ • id (UUID) PK      │       │                     │
│ • email             │       │ • room_id FK        │──────►│                     │
│ • name              │       │ • check_in          │       └─────────────────────┘
│ • picture           │       │ • check_out         │
│ • phone             │       │ • guests            │       ┌─────────────────────┐
│ • role              │       │ • guest_name        │       │  HOTELS (replica)   │
│ • created_at        │       │ • guest_email       │       ├─────────────────────┤
│ • updated_at        │       │ • guest_phone       │       │    (Same as above)  │
└─────────────────────┘       │ • special_requests  │       │                     │
                              │ • total_price       │       └─────────────────────┘
                              │ • original_price    │
                              │ • discount_pct      │       ┌─────────────────────┐
                              │ • status            │       │ ROOM_AVAILABILITY   │
                              │ • booking_reference │       │     (replica)       │
                              │ • created_at        │       ├─────────────────────┤
                              │ • updated_at        │       │    (Same as above)  │
                              └─────────────────────┘       └─────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────┐
│                       NOTIFICATION DATABASE (notification_db)                    │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
│    NOTIFICATIONS    │       │   SCHEDULED_TASKS   │       │NOTIFICATION_TEMPLATES│
├─────────────────────┤       ├─────────────────────┤       ├─────────────────────┤
│ • id (UUID) PK      │       │ • id (UUID) PK      │       │ • id (UUID) PK      │
│ • type              │       │ • task_name         │       │ • name              │
│ • recipient_email   │       │ • task_type         │       │ • type              │
│ • recipient_name    │       │ • schedule (cron)   │       │ • subject_template  │
│ • subject           │       │ • last_run_at       │       │ • body_template     │
│ • body              │       │ • next_run_at       │       │ • html_template     │
│ • metadata (JSON)   │       │ • status            │       │ • variables (JSON)  │
│ • status            │       │ • result (JSON)     │       │ • is_active         │
│ • retry_count       │       │ • created_at        │       │ • created_at        │
│ • error_message     │       │ • updated_at        │       │ • updated_at        │
│ • sent_at           │       └─────────────────────┘       └─────────────────────┘
│ • created_at        │
│ • updated_at        │
└─────────────────────┘
```

### Key Relationships

| Relationship              | Type        | Description                         |
| ------------------------- | ----------- | ----------------------------------- |
| Users → Hotels            | One-to-Many | An admin can manage multiple hotels |
| Hotels → Rooms            | One-to-Many | A hotel has multiple rooms          |
| Rooms → Room_Availability | One-to-Many | Daily availability per room         |
| Users → Bookings          | One-to-Many | A user can have multiple bookings   |
| Rooms → Bookings          | One-to-Many | A room can have multiple bookings   |

### Notification Types

- `BOOKING_CONFIRMATION` - Sent when booking is confirmed
- `BOOKING_CANCELLATION` - Sent when booking is cancelled
- `LOW_CAPACITY_ALERT` - Sent to admin when room capacity < 20%
- `PROMOTIONAL` - Marketing emails
- `SYSTEM` - System notifications

### Booking Status Flow

```
PENDING → CONFIRMED → COMPLETED
            ↓
        CANCELLED
```

---

## 🛠 Technology Stack

### Frontend

| Technology    | Purpose          |
| ------------- | ---------------- |
| React 18      | UI Framework     |
| Vite          | Build Tool       |
| Tailwind CSS  | Styling          |
| Firebase Auth | Authentication   |
| Axios         | HTTP Client      |
| React Router  | Navigation       |
| Leaflet       | Maps Integration |

### Backend

| Technology     | Purpose                                        |
| -------------- | ---------------------------------------------- |
| Node.js        | Runtime (Admin, Client, Notification services) |
| Express.js     | Web Framework                                  |
| Python/Flask   | ML Service                                     |
| PostgreSQL     | Database                                       |
| Redis          | Caching                                        |
| Google Pub/Sub | Message Queue                                  |

### Machine Learning

| Technology    | Purpose             |
| ------------- | ------------------- |
| scikit-learn  | ML Framework        |
| Random Forest | Pricing Model       |
| joblib        | Model Serialization |

### Cloud Infrastructure (GCP)

| Service           | Purpose            |
| ----------------- | ------------------ |
| Cloud Run         | Container Hosting  |
| Cloud SQL         | PostgreSQL Hosting |
| Memorystore       | Redis Hosting      |
| API Gateway       | Request Routing    |
| Pub/Sub           | Async Messaging    |
| Firebase Hosting  | Frontend Hosting   |
| Cloud Build       | CI/CD              |
| Artifact Registry | Container Registry |

---

## ✨ Features

### Client Features

- 🔍 **Hotel Search** - Search by city, dates, guests with filters
- 📍 **Map View** - Interactive map showing hotel locations
- 💰 **Dynamic Pricing** - ML-based price recommendations
- 🏷️ **Member Discount** - 10% off for registered users
- 📅 **Booking Management** - View and cancel bookings
- 📧 **Email Confirmations** - Automatic booking notifications
- 👤 **User Profile** - Manage account details

### Admin Features

- 🏨 **Hotel Management** - CRUD for hotels
- 🛏️ **Room Management** - CRUD for rooms with room types
- 📊 **Availability Control** - Set daily room availability
- 💵 **Price Management** - Override base prices
- 📈 **ML Price Suggestions** - AI-powered pricing insights
- ⚠️ **Low Capacity Alerts** - Automated email warnings
- 📋 **Dashboard** - Overview of properties

---

## 📚 API Documentation

### Base URL

```
https://hotel-booking-gateway-8n6yll8a.ew.gateway.dev
```

### Authentication

All protected endpoints require Firebase JWT token:

```
Authorization: Bearer <firebase_id_token>
```

### Key Endpoints

#### Hotels

| Method | Endpoint             | Auth  | Description       |
| ------ | -------------------- | ----- | ----------------- |
| GET    | `/api/v1/hotels`     | No    | List all hotels   |
| GET    | `/api/v1/hotels/:id` | No    | Get hotel details |
| POST   | `/api/v1/hotels`     | Admin | Create hotel      |
| PUT    | `/api/v1/hotels/:id` | Admin | Update hotel      |
| DELETE | `/api/v1/hotels/:id` | Admin | Delete hotel      |

#### Rooms

| Method | Endpoint                       | Auth  | Description          |
| ------ | ------------------------------ | ----- | -------------------- |
| GET    | `/api/v1/rooms/hotel/:hotelId` | No    | List rooms for hotel |
| POST   | `/api/v1/rooms`                | Admin | Create room          |
| PUT    | `/api/v1/rooms/:id`            | Admin | Update room          |
| DELETE | `/api/v1/rooms/:id`            | Admin | Delete room          |

#### Search & Booking

| Method | Endpoint                      | Auth     | Description            |
| ------ | ----------------------------- | -------- | ---------------------- |
| GET    | `/api/v1/search`              | Optional | Search available rooms |
| POST   | `/api/v1/bookings`            | User     | Create booking         |
| GET    | `/api/v1/bookings`            | User     | List user bookings     |
| PUT    | `/api/v1/bookings/:id/cancel` | User     | Cancel booking         |

#### Pricing

| Method | Endpoint                | Auth | Description             |
| ------ | ----------------------- | ---- | ----------------------- |
| POST   | `/api/v1/price/predict` | No   | Get ML price prediction |

---

## 💻 Local Development

### Prerequisites

- Node.js 18+
- Python 3.9+
- Docker & Docker Compose
- Google Cloud SDK

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/Instaken/hotel-booking-final.git
cd hotel-booking-final
```

2. **Backend Services**

```bash
# Admin Service
cd backend/admin-service
npm install
cp .env.example .env
npm run dev

# Client Service
cd backend/client-service
npm install
cp .env.example .env
npm run dev

# Notification Service
cd backend/notification-service
npm install
cp .env.example .env
npm run dev

# ML Service
cd backend/ml-service
pip install -r requirements.txt
python train_model.py  # Train the model first
python app.py
```

3. **Frontend Applications**

```bash
# Client App
cd frontend/client-app
npm install
npm run dev

# Admin Dashboard
cd frontend/admin-dashboard
npm install
npm run dev
```

4. **Database Setup**

```bash
# Run migrations
psql -U postgres -d admin_db -f database/migrations/001_admin_db_schema.sql
psql -U postgres -d client_db -f database/migrations/002_client_db_schema.sql
psql -U postgres -d notification_db -f database/migrations/003_notification_db_schema.sql

# Seed data (optional)
psql -U postgres -d admin_db -f database/seeds/001_sample_data.sql
```

---

## 🚀 Deployment

### Google Cloud Deployment

1. **Build and Push Docker Images**

```bash
./build_push.sh
```

2. **Deploy to Cloud Run**

```bash
gcloud run deploy admin-service \
  --image gcr.io/PROJECT_ID/admin-service \
  --platform managed \
  --region europe-west3

# Repeat for other services...
```

3. **Deploy API Gateway**

```bash
cd api-gateway
./setup-gateway.sh
```

4. **Deploy Frontend**

```bash
cd frontend/client-app
npm run build


cd frontend/admin-dashboard
npm run build

```

---

## 👥 Team

- **Developer**: Ozan Böce
- **NO**: 21070006020
- **Institution**: Yaşar University
- **Date**: January 2026

---

## 📄 License

This project is developed for educational purposes.

---

## 🙏 Acknowledgments

- Google Cloud Platform for cloud infrastructure
- Firebase for authentication and hosting
- Tailwind CSS for beautiful styling
- OpenStreetMap for map data

---

**⭐ If you found this project helpful, please give it a star!**
