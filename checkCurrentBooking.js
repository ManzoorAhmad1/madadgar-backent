import pool from './config/database.js';

async function checkCurrentBooking() {
  try {
    console.log('🔍 Checking current booking...\n');
    
    const [rows] = await pool.execute(`
      SELECT 
        id, 
        booking_id, 
        status, 
        payment,
        completed_at
      FROM bookings 
      ORDER BY created_at DESC 
      LIMIT 2
    `);
    
    rows.forEach((booking, index) => {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`Booking ${index + 1}`);
      console.log(`${'='.repeat(50)}`);
      console.log(`Database ID: ${booking.id}`);
      console.log(`Booking ID: ${booking.booking_id}`);
      console.log(`Status: ${booking.status}`);
      console.log(`Completed At: ${booking.completed_at || 'NULL'}`);
      console.log(`\nPayment Column (raw):`);
      console.log(booking.payment || 'NULL');
      
      if (booking.payment) {
        try {
          const paymentData = JSON.parse(booking.payment);
          console.log(`\n✅ Payment Data (parsed):`);
          console.log(JSON.stringify(paymentData, null, 2));
          
          if (paymentData.status) {
            console.log(`\n💰 Payment Status: ${paymentData.status}`);
          } else {
            console.log(`\n⚠️ NO 'status' field in payment object!`);
          }
        } catch (e) {
          console.log(`\n❌ Could not parse payment JSON:`, e.message);
        }
      } else {
        console.log(`\n❌ Payment column is NULL - no payment data saved!`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkCurrentBooking();
