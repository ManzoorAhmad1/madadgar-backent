import pool from './config/database.js';

async function checkPaymentData() {
  try {
    console.log('🔍 Checking payment data in database...\n');
    
    const [rows] = await pool.execute(`
      SELECT 
        id, 
        booking_id, 
        status, 
        payment,
        completed_at,
        created_at
      FROM bookings 
      WHERE status = 'completed'
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log(`📊 Found ${rows.length} completed bookings:\n`);
    
    rows.forEach((booking, index) => {
      console.log(`\n--- Booking ${index + 1} ---`);
      console.log(`ID: ${booking.id}`);
      console.log(`Booking ID: ${booking.booking_id}`);
      console.log(`Status: ${booking.status}`);
      console.log(`Payment Column (raw): ${booking.payment}`);
      
      if (booking.payment) {
        try {
          const paymentData = JSON.parse(booking.payment);
          console.log(`Payment Data (parsed):`, JSON.stringify(paymentData, null, 2));
          console.log(`Payment Status: ${paymentData.status || 'NOT SET'}`);
        } catch (e) {
          console.log(`⚠️ Could not parse payment JSON`);
        }
      } else {
        console.log(`❌ Payment column is NULL`);
      }
      
      console.log(`Completed At: ${booking.completed_at}`);
    });
    
    // Also check all bookings
    const [allRows] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN payment IS NOT NULL THEN 1 ELSE 0 END) as has_payment,
        SUM(CASE WHEN payment LIKE '%"status":"paid"%' THEN 1 ELSE 0 END) as paid
      FROM bookings
    `);
    
    console.log(`\n\n📈 Overall Stats:`);
    console.log(`Total bookings: ${allRows[0].total}`);
    console.log(`Completed bookings: ${allRows[0].completed}`);
    console.log(`Bookings with payment data: ${allRows[0].has_payment}`);
    console.log(`Bookings with status=paid: ${allRows[0].paid}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkPaymentData();
