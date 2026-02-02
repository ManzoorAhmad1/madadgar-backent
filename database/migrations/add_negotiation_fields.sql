-- Add negotiation and completion fields to bookings table

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS negotiated_amount DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS proposed_by VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completed_by JSON DEFAULT NULL,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL DEFAULT NULL;

-- Add comment
ALTER TABLE bookings MODIFY COLUMN negotiated_amount DECIMAL(10, 2) DEFAULT NULL COMMENT 'Final negotiated payment amount';
ALTER TABLE bookings MODIFY COLUMN proposed_by VARCHAR(20) DEFAULT NULL COMMENT 'Who proposed the amount: provider or client';
ALTER TABLE bookings MODIFY COLUMN payment_accepted BOOLEAN DEFAULT FALSE COMMENT 'Whether payment amount was accepted';
ALTER TABLE bookings MODIFY COLUMN completed_by JSON DEFAULT NULL COMMENT 'Array of roles who marked as complete';
ALTER TABLE bookings MODIFY COLUMN completed_at TIMESTAMP NULL DEFAULT NULL COMMENT 'Timestamp when booking was completed';
