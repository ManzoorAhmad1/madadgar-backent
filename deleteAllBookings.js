import pool from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const deleteAllBookings = async () => {
  try {
    console.log('🗑️  Starting to delete all bookings...');
    
    // Delete all related data first (foreign key constraints)
    console.log('Deleting reviews...');
    const [reviewResult] = await pool.execute('DELETE FROM reviews');
    console.log(`✅ Deleted ${reviewResult.affectedRows} reviews`);
    
    console.log('Deleting chat messages...');
    const [chatResult] = await pool.execute('DELETE FROM chat_messages');
    console.log(`✅ Deleted ${chatResult.affectedRows} chat messages`);
    
    console.log('Deleting notifications related to bookings...');
    const [notifResult] = await pool.execute(
      "DELETE FROM notifications WHERE related_model = 'booking'"
    );
    console.log(`✅ Deleted ${notifResult.affectedRows} notifications`);
    
    console.log('Deleting all bookings...');
    const [bookingResult] = await pool.execute('DELETE FROM bookings');
    console.log(`✅ Deleted ${bookingResult.affectedRows} bookings`);
    
    // Reset auto-increment
    await pool.execute('ALTER TABLE bookings AUTO_INCREMENT = 1');
    await pool.execute('ALTER TABLE reviews AUTO_INCREMENT = 1');
    await pool.execute('ALTER TABLE chat_messages AUTO_INCREMENT = 1');
    
    console.log('\n✅ ALL BOOKINGS DELETED SUCCESSFULLY!');
    console.log('📊 Summary:');
    console.log(`   - Bookings: ${bookingResult.affectedRows}`);
    console.log(`   - Reviews: ${reviewResult.affectedRows}`);
    console.log(`   - Chat Messages: ${chatResult.affectedRows}`);
    console.log(`   - Notifications: ${notifResult.affectedRows}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting bookings:', error);
    process.exit(1);
  }
};

deleteAllBookings();
