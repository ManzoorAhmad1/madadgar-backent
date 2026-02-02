import pool from '../config/database.js';

async function createChatTable() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🚀 Creating chat_messages table...');
    
    // Create chat messages table
    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ chat_messages table created successfully');
    
    // Add columns to bookings table
    console.log('🔧 Adding chat columns to bookings table...');
    
    try {
      await connection.query(`
        ALTER TABLE bookings
        ADD COLUMN last_message_at TIMESTAMP NULL COMMENT 'Last chat message timestamp'
      `);
      console.log('✅ Added last_message_at column');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('⏭️  last_message_at column already exists');
      } else {
        throw e;
      }
    }
    
    try {
      await connection.query(`
        ALTER TABLE bookings
        ADD COLUMN unread_client_count INT DEFAULT 0 COMMENT 'Unread messages for client'
      `);
      console.log('✅ Added unread_client_count column');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('⏭️  unread_client_count column already exists');
      } else {
        throw e;
      }
    }
    
    try {
      await connection.query(`
        ALTER TABLE bookings
        ADD COLUMN unread_provider_count INT DEFAULT 0 COMMENT 'Unread messages for provider'
      `);
      console.log('✅ Added unread_provider_count column');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('⏭️  unread_provider_count column already exists');
      } else {
        throw e;
      }
    }
    
    console.log('🎉 Chat system setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating chat table:', error);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

createChatTable().catch(console.error);
