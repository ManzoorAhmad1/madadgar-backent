import pool from '../config/database.js';

async function migrateChatMessages() {
  const connection = await pool.getConnection();
  try {
    console.log('Starting migration to fix admin chat messages...');
    
    // Drop the existing foreign key constraint
    await connection.query('ALTER TABLE chat_messages DROP FOREIGN KEY chat_messages_ibfk_2');
    console.log('✓ Dropped foreign key constraint');
    
    // Modify sender_id to allow NULL values
    await connection.query('ALTER TABLE chat_messages MODIFY COLUMN sender_id INT NULL');
    console.log('✓ Modified sender_id to allow NULL');
    
    // Add back the foreign key constraint
    await connection.query('ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_ibfk_2 FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE');
    console.log('✓ Re-added foreign key constraint');
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

migrateChatMessages();
