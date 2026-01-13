-- =============================================
-- SAMPLE DATA FOR ADMIN DATABASE
-- Run this after 001_admin_db_schema.sql
-- =============================================

-- =============================================
-- SAMPLE ADMIN USERS
-- Note: In production, users are created via Google Auth
-- These are for testing purposes
-- =============================================
INSERT INTO users (id, google_id, email, name, role) VALUES
('11111111-1111-1111-1111-111111111111', 'google_admin_001', 'admin@hotelbooking.com', 'System Admin', 'ADMIN'),
('22222222-2222-2222-2222-222222222222', 'google_admin_002', 'hotel.manager@example.com', 'Hotel Manager', 'ADMIN'),
('33333333-3333-3333-3333-333333333333', 'google_user_001', 'user@example.com', 'Test User', 'USER')
ON CONFLICT (google_id) DO NOTHING;

-- =============================================
-- SAMPLE HOTELS
-- =============================================
INSERT INTO hotels (id, name, description, address, city, country, latitude, longitude, star_rating, amenities, images, admin_id) VALUES
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Grand Palace Hotel',
    'Luxury 5-star hotel in the heart of Paris with stunning Eiffel Tower views. Experience world-class hospitality with our award-winning restaurant, spa, and concierge services.',
    '15 Avenue des Champs-Élysées',
    'Paris',
    'France',
    48.8566,
    2.3522,
    5,
    '["WiFi", "Pool", "Spa", "Restaurant", "Bar", "Gym", "Room Service", "Concierge", "Valet Parking", "Airport Shuttle"]',
    '["/images/hotels/grand-palace-1.jpg", "/images/hotels/grand-palace-2.jpg", "/images/hotels/grand-palace-3.jpg"]',
    '11111111-1111-1111-1111-111111111111'
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Barcelona Beach Resort',
    'Beautiful beachfront resort with direct beach access. Perfect for families and couples looking for a relaxing Mediterranean getaway.',
    '123 Passeig Marítim',
    'Barcelona',
    'Spain',
    41.3851,
    2.1734,
    4,
    '["WiFi", "Pool", "Beach Access", "Restaurant", "Bar", "Kids Club", "Water Sports", "Spa"]',
    '["/images/hotels/barcelona-beach-1.jpg", "/images/hotels/barcelona-beach-2.jpg"]',
    '22222222-2222-2222-2222-222222222222'
),
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Amsterdam Canal House',
    'Charming boutique hotel in a historic 17th-century canal house. Walking distance to major museums and attractions.',
    '45 Herengracht',
    'Amsterdam',
    'Netherlands',
    52.3676,
    4.9041,
    4,
    '["WiFi", "Breakfast Included", "Bar", "Bike Rental", "Canal View", "Historic Building"]',
    '["/images/hotels/amsterdam-canal-1.jpg", "/images/hotels/amsterdam-canal-2.jpg"]',
    '11111111-1111-1111-1111-111111111111'
),
(
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Rome Imperial Hotel',
    'Elegant hotel near the Colosseum with rooftop terrace offering panoramic views of ancient Rome.',
    '78 Via dei Fori Imperiali',
    'Rome',
    'Italy',
    41.9028,
    12.4964,
    4,
    '["WiFi", "Restaurant", "Rooftop Bar", "Concierge", "Airport Shuttle", "Historic Location"]',
    '["/images/hotels/rome-imperial-1.jpg", "/images/hotels/rome-imperial-2.jpg"]',
    '22222222-2222-2222-2222-222222222222'
),
(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'London Victoria Inn',
    'Modern business hotel near Victoria Station. Ideal for business travelers with excellent transport connections.',
    '200 Victoria Street',
    'London',
    'United Kingdom',
    51.4975,
    -0.1357,
    3,
    '["WiFi", "Business Center", "Meeting Rooms", "Restaurant", "Bar", "24h Reception"]',
    '["/images/hotels/london-victoria-1.jpg"]',
    '11111111-1111-1111-1111-111111111111'
),
(
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'Berlin Central Hotel',
    'Contemporary hotel in the heart of Berlin, steps away from Brandenburg Gate and Museum Island.',
    '10 Unter den Linden',
    'Berlin',
    'Germany',
    52.5200,
    13.4050,
    4,
    '["WiFi", "Restaurant", "Bar", "Gym", "Sauna", "Concierge", "Bike Rental"]',
    '["/images/hotels/berlin-central-1.jpg", "/images/hotels/berlin-central-2.jpg"]',
    '22222222-2222-2222-2222-222222222222'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- SAMPLE ROOMS
-- =============================================
INSERT INTO rooms (id, hotel_id, name, description, room_type, capacity, base_price, size_sqm, amenities, images) VALUES
-- Grand Palace Hotel rooms
('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Standard Single', 'Cozy single room with city view', 'SINGLE', 1, 150.00, 20, '["WiFi", "TV", "Mini Bar", "Safe", "Air Conditioning"]', '[]'),
('a2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Deluxe Double', 'Spacious double room with Eiffel Tower view', 'DOUBLE', 2, 280.00, 35, '["WiFi", "TV", "Mini Bar", "Safe", "Air Conditioning", "Balcony", "Nespresso Machine"]', '[]'),
('a3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Executive Suite', 'Luxurious suite with separate living area', 'SUITE', 2, 450.00, 60, '["WiFi", "TV", "Mini Bar", "Safe", "Air Conditioning", "Living Room", "Jacuzzi", "Butler Service"]', '[]'),
('a4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Family Room', 'Large room perfect for families', 'FAMILY', 4, 380.00, 50, '["WiFi", "TV", "Mini Bar", "Safe", "Air Conditioning", "Extra Beds", "Kids Amenities"]', '[]'),

-- Barcelona Beach Resort rooms
('b1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Sea View Double', 'Double room with Mediterranean sea view', 'DOUBLE', 2, 180.00, 30, '["WiFi", "TV", "Air Conditioning", "Balcony", "Sea View"]', '[]'),
('b2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Beach Suite', 'Premium suite with direct beach access', 'SUITE', 2, 320.00, 55, '["WiFi", "TV", "Air Conditioning", "Terrace", "Beach Access", "Jacuzzi"]', '[]'),
('b3333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Family Beach Room', 'Spacious family room near the beach', 'FAMILY', 5, 280.00, 45, '["WiFi", "TV", "Air Conditioning", "Kids Beds", "Pool Access"]', '[]'),

-- Amsterdam Canal House rooms
('c1111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Canal View Single', 'Charming single room overlooking the canal', 'SINGLE', 1, 120.00, 18, '["WiFi", "TV", "Canal View", "Historic Decor"]', '[]'),
('c2222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Deluxe Canal Double', 'Double room with beautiful canal views', 'DOUBLE', 2, 200.00, 28, '["WiFi", "TV", "Canal View", "Mini Bar", "Historic Decor"]', '[]'),
('c3333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Heritage Suite', 'Unique suite in historic building', 'SUITE', 2, 350.00, 50, '["WiFi", "TV", "Canal View", "Living Room", "Original Beams", "Antique Furniture"]', '[]'),

-- Rome Imperial Hotel rooms
('d1111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Classic Double', 'Comfortable double room with Roman style', 'DOUBLE', 2, 160.00, 25, '["WiFi", "TV", "Air Conditioning", "Safe"]', '[]'),
('d2222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Colosseum View Suite', 'Suite with stunning Colosseum views', 'SUITE', 2, 380.00, 55, '["WiFi", "TV", "Air Conditioning", "Balcony", "Colosseum View", "Mini Bar"]', '[]'),
('d3333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Deluxe Family', 'Family room near ancient attractions', 'FAMILY', 4, 300.00, 48, '["WiFi", "TV", "Air Conditioning", "Extra Beds", "Family Amenities"]', '[]'),

-- London Victoria Inn rooms
('e1111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Business Single', 'Efficient single room for business travelers', 'SINGLE', 1, 95.00, 16, '["WiFi", "TV", "Desk", "Safe"]', '[]'),
('e2222222-2222-2222-2222-222222222222', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Standard Double', 'Comfortable double room', 'DOUBLE', 2, 140.00, 22, '["WiFi", "TV", "Desk", "Safe", "Tea/Coffee"]', '[]'),

-- Berlin Central Hotel rooms
('f1111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Modern Single', 'Contemporary single room', 'SINGLE', 1, 85.00, 18, '["WiFi", "TV", "Air Conditioning"]', '[]'),
('f2222222-2222-2222-2222-222222222222', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Design Double', 'Stylish double room with modern design', 'DOUBLE', 2, 150.00, 28, '["WiFi", "TV", "Air Conditioning", "Mini Bar", "Rain Shower"]', '[]'),
('f3333333-3333-3333-3333-333333333333', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Deluxe Suite', 'Spacious suite with Berlin skyline views', 'DELUXE', 2, 280.00, 50, '["WiFi", "TV", "Air Conditioning", "Living Room", "City View", "Jacuzzi"]', '[]')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- SAMPLE ROOM AVAILABILITY (Next 60 days)
-- =============================================
DO $$
DECLARE
    room_record RECORD;
    current_date_var DATE;
    end_date DATE;
    room_base_price DECIMAL(10,2);
    daily_price DECIMAL(10,2);
    availability INTEGER;
BEGIN
    current_date_var := CURRENT_DATE;
    end_date := CURRENT_DATE + INTERVAL '60 days';
    
    FOR room_record IN SELECT id, base_price FROM rooms LOOP
        room_base_price := room_record.base_price;
        
        WHILE current_date_var <= end_date LOOP
            -- Weekend premium (20%)
            IF EXTRACT(DOW FROM current_date_var) IN (0, 6) THEN
                daily_price := room_base_price * 1.20;
            ELSE
                daily_price := room_base_price;
            END IF;
            
            -- Random availability (1-5 rooms)
            availability := floor(random() * 5 + 1)::INTEGER;
            
            INSERT INTO room_availability (id, room_id, date, available_count, price)
            VALUES (gen_random_uuid(), room_record.id, current_date_var, availability, daily_price)
            ON CONFLICT (room_id, date) DO NOTHING;
            
            current_date_var := current_date_var + INTERVAL '1 day';
        END LOOP;
        
        current_date_var := CURRENT_DATE;
    END LOOP;
END $$;
