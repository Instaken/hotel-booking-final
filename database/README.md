# Database Setup Guide

## NeonDB Connection URLs

You have 3 separate databases:

```
ADMIN_DB_URL=postgresql://Admin:npg_JQDd3HSz6jWr@ep-old-haze-ag1a6v7o-pooler.c-2.eu-central-1.aws.neon.tech/admin_db?sslmode=require&channel_binding=require

CLIENT_DB_URL=postgresql://Admin:npg_JQDd3HSz6jWr@ep-old-haze-ag1a6v7o-pooler.c-2.eu-central-1.aws.neon.tech/client_db?sslmode=require&channel_binding=require

NOTIFICATION_DB_URL=postgresql://Admin:npg_JQDd3HSz6jWr@ep-old-haze-ag1a6v7o-pooler.c-2.eu-central-1.aws.neon.tech/notification_db?sslmode=require&channel_binding=require
```

## Running Migrations

### Option 1: Using NeonDB SQL Editor

1. Go to NeonDB Console: https://console.neon.tech/
2. Select your project
3. Go to "SQL Editor"
4. Select the appropriate database (admin_db, client_db, or notification_db)
5. Copy and paste the migration SQL and run

### Option 2: Using psql CLI

```bash
# Admin DB
psql "postgresql://Admin:npg_JQDd3HSz6jWr@ep-old-haze-ag1a6v7o-pooler.c-2.eu-central-1.aws.neon.tech/admin_db?sslmode=require" -f migrations/001_admin_db_schema.sql

# Client DB
psql "postgresql://Admin:npg_JQDd3HSz6jWr@ep-old-haze-ag1a6v7o-pooler.c-2.eu-central-1.aws.neon.tech/client_db?sslmode=require" -f migrations/002_client_db_schema.sql

# Notification DB
psql "postgresql://Admin:npg_JQDd3HSz6jWr@ep-old-haze-ag1a6v7o-pooler.c-2.eu-central-1.aws.neon.tech/notification_db?sslmode=require" -f migrations/003_notification_db_schema.sql
```

## Order of Execution

1. **First, run migrations (schema creation):**

   - `001_admin_db_schema.sql` → admin_db
   - `002_client_db_schema.sql` → client_db
   - `003_notification_db_schema.sql` → notification_db

2. **Then, run seeds (sample data):**
   - `001_sample_data.sql` → admin_db
   - For client_db, manually copy the data or use the sync script

## Syncing Data Between Databases

Since you're using NeonDB which doesn't support dblink by default, you have two options:

### Option A: Manual Copy (Recommended for initial setup)

1. Run the seed data in admin_db
2. Export the data and import to client_db
3. Or simply run the same INSERT statements in both databases

### Option B: Using Application-Level Sync

The admin-service can publish changes to Pub/Sub, and a sync worker can update client_db.

## Database Schema Overview

### admin_db

- `users` - All users (both admins and regular users)
- `hotels` - Hotel information
- `rooms` - Room types and details
- `room_availability` - Daily availability and pricing

### client_db

- `users` - User information for bookings
- `hotels` - Read replica of hotels
- `rooms` - Read replica of rooms
- `room_availability` - Read replica of availability
- `bookings` - Customer bookings

### notification_db

- `notifications` - Sent and pending notifications
- `scheduled_tasks` - Scheduled job tracking
- `notification_templates` - Email templates

## Useful Queries

### Check all tables

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

### Count records

```sql
SELECT
    (SELECT COUNT(*) FROM hotels) as hotels,
    (SELECT COUNT(*) FROM rooms) as rooms,
    (SELECT COUNT(*) FROM room_availability) as availability;
```

### Check availability for a hotel

```sql
SELECT r.name, ra.date, ra.available_count, ra.price
FROM rooms r
JOIN room_availability ra ON r.id = ra.room_id
WHERE r.hotel_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
AND ra.date >= CURRENT_DATE
ORDER BY ra.date
LIMIT 30;
```
