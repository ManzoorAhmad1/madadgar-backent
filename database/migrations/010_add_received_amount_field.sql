-- Add received_amount field to bookings table
-- This field stores the actual amount received by provider during in_progress status

ALTER TABLE bookings 
ADD COLUMN received_amount DECIMAL(10, 2) DEFAULT NULL 
COMMENT 'Actual amount received by provider from client';
