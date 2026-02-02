-- Add review fields to reviews table if not already present
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS images TEXT COMMENT 'JSON array of image URLs',
ADD COLUMN IF NOT EXISTS provider_response TEXT COMMENT 'Provider response to review',
ADD COLUMN IF NOT EXISTS response_date TIMESTAMP NULL COMMENT 'When provider responded';

-- Add average rating to users table for providers
ALTER TABLE users
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00 COMMENT 'Average rating from reviews',
ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0 COMMENT 'Total number of reviews';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_users_rating ON users(average_rating);
