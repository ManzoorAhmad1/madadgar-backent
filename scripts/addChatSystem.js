import pool from '../config/database.js';

export async function up() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    console.log('🔄 Running chat system migration...');

    // Create chat_messages table
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
        INDEX idx_booking_messages (booking_id, created_at),
        INDEX idx_sender (sender_id),
        INDEX idx_unread (is_read, booking_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ chat_messages table created');

    // Check if booking columns already exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'bookings' 
        AND COLUMN_NAME IN ('last_message_at', 'unread_client_count', 'unread_provider_count')
    `);

    const existingColumns = columns.map(c => c.COLUMN_NAME);

    if (!existingColumns.includes('last_message_at')) {
      await connection.query(`
        ALTER TABLE bookings
        ADD COLUMN last_message_at TIMESTAMP NULL COMMENT 'Last chat message timestamp'
      `);
      console.log('✅ Added last_message_at to bookings');
    }

    if (!existingColumns.includes('unread_client_count')) {
      await connection.query(`
        ALTER TABLE bookings
        ADD COLUMN unread_client_count INT DEFAULT 0 COMMENT 'Unread messages for client'
      `);
      console.log('✅ Added unread_client_count to bookings');
    }

    if (!existingColumns.includes('unread_provider_count')) {
      await connection.query(`
        ALTER TABLE bookings
        ADD COLUMN unread_provider_count INT DEFAULT 0 COMMENT 'Unread messages for provider'
      `);
      console.log('✅ Added unread_provider_count to bookings');
    }

    await connection.commit();
    console.log('✅ Chat system migration completed successfully');
  } catch (error) {
    await connection.rollback();
    console.error('❌ Chat system migration failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  up()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default { up };
