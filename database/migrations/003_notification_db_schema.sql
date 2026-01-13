-- =============================================
-- NOTIFICATION DATABASE SCHEMA
-- Database: notification_db
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'BOOKING_CONFIRMATION',
        'BOOKING_CANCELLATION',
        'LOW_CAPACITY_ALERT',
        'PROMOTIONAL',
        'SYSTEM'
    )),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'RETRY')),
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_email);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_metadata ON notifications USING GIN(metadata);

-- =============================================
-- SCHEDULED TASKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_name VARCHAR(100) NOT NULL,
    task_type VARCHAR(50) NOT NULL CHECK (task_type IN (
        'CAPACITY_CHECK',
        'RESERVATION_REMINDER',
        'CLEANUP',
        'REPORT'
    )),
    schedule VARCHAR(100), -- Cron expression
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'FAILED')),
    result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_name ON scheduled_tasks(task_name);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON scheduled_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON scheduled_tasks(status);

-- =============================================
-- NOTIFICATION TEMPLATES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    html_template TEXT,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_templates_name ON notification_templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_type ON notification_templates(type);

-- =============================================
-- UPDATE TIMESTAMP TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON scheduled_tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON scheduled_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON notification_templates;
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- DEFAULT NOTIFICATION TEMPLATES
-- =============================================
INSERT INTO notification_templates (name, type, subject_template, body_template, html_template, variables)
VALUES 
(
    'booking_confirmation',
    'BOOKING_CONFIRMATION',
    'Booking Confirmation - {{booking_reference}}',
    'Dear {{guest_name}},

Your booking has been confirmed!

Booking Reference: {{booking_reference}}
Hotel: {{hotel_name}}
Room: {{room_name}}
Check-in: {{check_in}}
Check-out: {{check_out}}
Guests: {{guests}}
Total Price: €{{total_price}}

Thank you for choosing our service!

Best regards,
Hotel Booking Team',
    NULL,
    '["booking_reference", "guest_name", "hotel_name", "room_name", "check_in", "check_out", "guests", "total_price"]'
),
(
    'low_capacity_alert',
    'LOW_CAPACITY_ALERT',
    'Low Capacity Alert - Action Required',
    'Dear {{admin_name}},

The following rooms have less than 20% capacity available for the next month:

{{rooms_list}}

Please consider adjusting availability or taking promotional actions.

Best regards,
Hotel Booking System',
    NULL,
    '["admin_name", "rooms_list"]'
)
ON CONFLICT (name) DO NOTHING;
