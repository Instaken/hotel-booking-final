-- =============================================
-- COPY DATA FROM ADMIN_DB TO CLIENT_DB
-- Run this after inserting data into admin_db
-- This syncs hotels, rooms, and availability to client_db
-- =============================================

-- Note: In production, you would use a proper data sync mechanism
-- like Pub/Sub triggers or a scheduled job

-- First, copy the sample users
INSERT INTO users (id, google_id, email, name, role, created_at, updated_at)
SELECT id, google_id, email, name, role, created_at, updated_at
FROM dblink(
    'dbname=admin_db host=YOUR_HOST user=YOUR_USER password=YOUR_PASSWORD',
    'SELECT id, google_id, email, name, role, created_at, updated_at FROM users'
) AS t(id UUID, google_id VARCHAR, email VARCHAR, name VARCHAR, role VARCHAR, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = EXCLUDED.updated_at;

-- Copy hotels
INSERT INTO hotels (id, name, description, address, city, country, latitude, longitude, star_rating, amenities, images, admin_id, is_active, created_at, updated_at)
SELECT id, name, description, address, city, country, latitude, longitude, star_rating, amenities, images, admin_id, is_active, created_at, updated_at
FROM dblink(
    'dbname=admin_db host=YOUR_HOST user=YOUR_USER password=YOUR_PASSWORD',
    'SELECT id, name, description, address, city, country, latitude, longitude, star_rating, amenities, images, admin_id, is_active, created_at, updated_at FROM hotels'
) AS t(id UUID, name VARCHAR, description TEXT, address VARCHAR, city VARCHAR, country VARCHAR, latitude DECIMAL, longitude DECIMAL, star_rating INTEGER, amenities JSONB, images JSONB, admin_id UUID, is_active BOOLEAN, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    star_rating = EXCLUDED.star_rating,
    amenities = EXCLUDED.amenities,
    images = EXCLUDED.images,
    is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at;

-- Copy rooms
INSERT INTO rooms (id, hotel_id, name, description, room_type, capacity, base_price, size_sqm, amenities, images, is_active, created_at, updated_at)
SELECT id, hotel_id, name, description, room_type, capacity, base_price, size_sqm, amenities, images, is_active, created_at, updated_at
FROM dblink(
    'dbname=admin_db host=YOUR_HOST user=YOUR_USER password=YOUR_PASSWORD',
    'SELECT id, hotel_id, name, description, room_type, capacity, base_price, size_sqm, amenities, images, is_active, created_at, updated_at FROM rooms'
) AS t(id UUID, hotel_id UUID, name VARCHAR, description TEXT, room_type VARCHAR, capacity INTEGER, base_price DECIMAL, size_sqm DECIMAL, amenities JSONB, images JSONB, is_active BOOLEAN, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    base_price = EXCLUDED.base_price,
    amenities = EXCLUDED.amenities,
    is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at;

-- Copy availability
INSERT INTO room_availability (id, room_id, date, available_count, price, created_at, updated_at)
SELECT id, room_id, date, available_count, price, created_at, updated_at
FROM dblink(
    'dbname=admin_db host=YOUR_HOST user=YOUR_USER password=YOUR_PASSWORD',
    'SELECT id, room_id, date, available_count, price, created_at, updated_at FROM room_availability'
) AS t(id UUID, room_id UUID, date DATE, available_count INTEGER, price DECIMAL, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
ON CONFLICT (room_id, date) DO UPDATE SET
    available_count = EXCLUDED.available_count,
    price = EXCLUDED.price,
    updated_at = EXCLUDED.updated_at;
