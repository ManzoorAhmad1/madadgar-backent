-- Migration: Create service_categories table
-- Created: 2026-01-14

CREATE TABLE IF NOT EXISTS service_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) UNIQUE NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL,
  image VARCHAR(500) NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  pricing_rules JSON,
  requirements JSON,
  is_active BOOLEAN DEFAULT TRUE,
  sorting_order INT DEFAULT 0,
  providers_count INT DEFAULT 0,
  bookings_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug),
  INDEX idx_is_active (is_active),
  INDEX idx_sorting_order (sorting_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
