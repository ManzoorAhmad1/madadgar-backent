-- Migration: Create bookings table
-- Created: 2026-01-14

CREATE TABLE IF NOT EXISTS bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id VARCHAR(50) UNIQUE NOT NULL,
  client_id INT NOT NULL,
  provider_id INT NOT NULL,
  service_category_id INT NOT NULL,
  service_description TEXT NOT NULL,
  location_address TEXT NOT NULL,
  location_coordinates JSON,
  scheduled_time DATETIME NOT NULL,
  status ENUM(
    'pending', 'accepted', 'rejected', 'en_route', 
    'arrived', 'in_progress', 'completed', 'cancelled', 'disputed'
  ) DEFAULT 'pending',
  pricing JSON,
  payment JSON,
  tracking JSON,
  review JSON,
  cancellation JSON,
  chat_messages JSON,
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_booking_id (booking_id),
  INDEX idx_client_id (client_id),
  INDEX idx_provider_id (provider_id),
  INDEX idx_service_category_id (service_category_id),
  INDEX idx_status (status),
  INDEX idx_scheduled_time (scheduled_time),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (service_category_id) REFERENCES service_categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
