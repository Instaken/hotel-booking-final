# Google Cloud API Gateway Configuration

## Prerequisites

1. Google Cloud Project with billing enabled
2. Cloud Run services deployed
3. gcloud CLI installed and authenticated

## Files

- `openapi-spec.yaml` - OpenAPI 2.0 specification for API Gateway
- `setup-gateway.sh` - Setup script for deploying the gateway

## Setup Steps

### 1. Update OpenAPI Spec

Before deploying, update `openapi-spec.yaml`:

1. Replace `YOUR_PROJECT_ID` with your actual project ID (hotel-booking-system-final)
2. Replace all `XXXXX` in service URLs with actual Cloud Run service URLs

Example:

```yaml
# Before
address: https://admin-service-XXXXX-uc.a.run.app

# After
address: https://admin-service-abc123xyz-ew.a.run.app
```

### 2. Create Service Account

```bash
# Create service account for API Gateway
gcloud iam service-accounts create api-gateway-sa \
    --display-name="API Gateway Service Account" \
    --project=hotel-booking-system-final

# Grant Cloud Run Invoker role
gcloud projects add-iam-policy-binding hotel-booking-system-final \
    --member="serviceAccount:api-gateway-sa@hotel-booking-system-final.iam.gserviceaccount.com" \
    --role="roles/run.invoker"
```

### 3. Deploy API Gateway

```bash
cd api-gateway
chmod +x setup-gateway.sh
./setup-gateway.sh
```

### 4. Update Cloud Run Services

Make Cloud Run services allow unauthenticated access OR configure IAM:

```bash
# Option A: Allow unauthenticated (simpler)
gcloud run services add-iam-policy-binding admin-service \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --region=europe-west1

# Option B: Only allow API Gateway service account
gcloud run services add-iam-policy-binding admin-service \
    --member="serviceAccount:api-gateway-sa@hotel-booking-system-final.iam.gserviceaccount.com" \
    --role="roles/run.invoker" \
    --region=europe-west1
```

## API Endpoints

### Public Endpoints (No Auth Required)

- `GET /api/v1/hotels` - List hotels
- `GET /api/v1/hotels/{id}` - Get hotel details
- `GET /api/v1/search/hotels` - Search hotels
- `GET /api/v1/search/destinations` - Get destinations
- `GET /api/v1/search/map` - Get hotels for map
- `GET /api/v1/price/predict` - Price prediction

### Authenticated Endpoints (Require Google ID Token)

- `POST /api/v1/hotels` - Create hotel (Admin)
- `PUT /api/v1/hotels/{id}` - Update hotel (Admin)
- `DELETE /api/v1/hotels/{id}` - Delete hotel (Admin)
- `GET /api/v1/rooms` - List rooms (Admin)
- `POST /api/v1/rooms` - Create room (Admin)
- `GET /api/v1/availability` - Get availability (Admin)
- `POST /api/v1/availability` - Set availability (Admin)
- `GET /api/v1/bookings` - List user bookings
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/user/profile` - Get user profile

## Authentication

The API uses Google Identity Platform for authentication.

Frontend should:

1. Sign in user with Google Identity Platform
2. Get ID token: `firebase.auth().currentUser.getIdToken()`
3. Include in requests: `Authorization: Bearer <ID_TOKEN>`

## Updating API Config

When you need to update the API:

```bash
# Create new config version
gcloud api-gateway api-configs create hotel-booking-config-v2 \
    --api=hotel-booking-api \
    --openapi-spec=openapi-spec.yaml \
    --project=hotel-booking-system-final

# Update gateway to use new config
gcloud api-gateway gateways update hotel-booking-gateway \
    --api=hotel-booking-api \
    --api-config=hotel-booking-config-v2 \
    --location=europe-west1 \
    --project=hotel-booking-system-final
```

## Monitoring

View API Gateway metrics in Google Cloud Console:

- APIs & Services > API Gateway
- Select your gateway to see traffic, latency, and errors
