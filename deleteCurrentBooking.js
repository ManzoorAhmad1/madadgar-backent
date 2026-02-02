import pool from './config/database.js';

async function deleteBooking() {
  try {
    console.log('🗑️  Deleting current booking...\n');
    
    // Delete the booking with ID 2
    await pool.execute('DELETE FROM reviews WHERE booking_id = 2');
    await pool.execute('DELETE FROM chat_messages WHERE booking_id = 2');
    await pool.execute('DELETE FROM notifications WHERE booking_id = 2');
    await pool.execute('DELETE FROM bookings WHERE id = 2');
    
    console.log('✅ Booking deleted successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

deleteBooking();
