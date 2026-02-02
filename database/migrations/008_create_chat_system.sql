-- Create chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id VARCHAR(50) NOT NULL,
  sender_id INT NOT NULL,
  sender_type ENUM('client', 'provider', 'admin') NOT NULL,
  message TEXT NOT NULL,
  message_type ENUM('text', 'image', 'file', 'location') DEFAULT 'text',
  file_url VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_booking_messages (booking_id, created_at),
  INDEX idx_sender (sender_id),
  INDEX idx_unread (is_read, booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add typing status tracking (in-memory via socket, but we'll track last activity)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP NULL COMMENT 'Last chat message timestamp',
ADD COLUMN IF NOT EXISTS unread_client_count INT DEFAULT 0 COMMENT 'Unread messages for client',
ADD COLUMN IF NOT EXISTS unread_provider_count INT DEFAULT 0 COMMENT 'Unread messages for provider';
