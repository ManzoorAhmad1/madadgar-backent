-- Migration: Create notifications table
-- Created: 2026-01-14

CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM(
    'booking_created', 'booking_accepted', 'booking_rejected', 
    'booking_cancelled', 'provider_en_route', 'provider_arrived',
    'service_started', 'service_completed', 'payment_received',
    'review_received', 'document_verified', 'account_approved', 'general'
  ) NOT NULL,
  related_id INT,
  related_model ENUM('Booking', 'User', 'Review'),
  is_read BOOLEAN DEFAULT FALSE,
  read_at DATETIME,
  data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_type (type),
  INDEX idx_created_at (created_at),
  INDEX idx_user_read (user_id, is_read),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
