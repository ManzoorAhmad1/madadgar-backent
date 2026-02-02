-- Migration: Create reviews table
-- Created: 2026-01-14

CREATE TABLE IF NOT EXISTS reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT UNIQUE NOT NULL,
  client_id INT NOT NULL,
  provider_id INT NOT NULL,
  service_category_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  images JSON,
  provider_response JSON,
  is_reported BOOLEAN DEFAULT FALSE,
  report_reason TEXT,
  helpful_votes INT DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_booking_id (booking_id),
  INDEX idx_client_id (client_id),
  INDEX idx_provider_id (provider_id),
  INDEX idx_service_category_id (service_category_id),
  INDEX idx_rating (rating),
  INDEX idx_is_visible (is_visible),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (service_category_id) REFERENCES service_categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
