import pool from '../config/database.js';

async function checkBooking() {
  console.log('🔍 Checking Booking ID: 5\n');

  try {
    // Get booking details
    const [bookings] = await pool.execute(`
      SELECT * FROM bookings WHERE id = 5
    `);

    if (bookings.length === 0) {
      console.log('❌ Booking ID 5 not found in database!');
    } else {
      console.log('✅ Booking found!');
      console.log('\n📋 Booking Details:');
      const booking = bookings[0];
      
      console.log('ID:', booking.id);
      console.log('Booking ID:', booking.booking_id);
      console.log('Client ID:', booking.client_id);
      console.log('Provider ID:', booking.provider_id);
      console.log('Service Category ID:', booking.service_category_id);
      console.log('Status:', booking.status);
      console.log('Location Address:', booking.location_address);
      console.log('Location Coordinates:', booking.location_coordinates);
      console.log('Scheduled Time:', booking.scheduled_time);
      console.log('Created At:', booking.created_at);
      
      // Parse JSON fields
      if (booking.pricing) {
        console.log('\n💰 Pricing:', JSON.parse(booking.pricing));
      }
      
      if (booking.payment) {
        console.log('\n💳 Payment:', JSON.parse(booking.payment));
      }
      
      if (booking.tracking) {
        console.log('\n📍 Tracking:', JSON.parse(booking.tracking));
      }

      // Get client details
      const [clients] = await pool.execute(
        'SELECT id, name, email, phone, role FROM users WHERE id = ?',
        [booking.client_id]
      );
      
      if (clients.length > 0) {
        console.log('\n👤 Client:', clients[0]);
      }

      // Get provider details
      const [providers] = await pool.execute(
        'SELECT id, name, email, phone, role FROM users WHERE id = ?',
        [booking.provider_id]
      );
      
      if (providers.length > 0) {
        console.log('\n🔧 Provider:', providers[0]);
      }

      // Get service category
      const [categories] = await pool.execute(
        'SELECT * FROM service_categories WHERE id = ?',
        [booking.service_category_id]
      );
      
      if (categories.length > 0) {
        console.log('\n🛠️ Service Category:', categories[0]);
      }
    }

    // Check all bookings for this client
    const clientId = bookings[0]?.client_id;
    if (clientId) {
      console.log(`\n\n📊 All bookings for client ${clientId}:`);
      const [allBookings] = await pool.execute(`
        SELECT 
          b.id,
          b.booking_id,
          b.status,
          b.scheduled_time,
          b.created_at,
          p.name as provider_name,
          sc.name as service_name
        FROM bookings b
        LEFT JOIN users p ON b.provider_id = p.id
        LEFT JOIN service_categories sc ON b.service_category_id = sc.id
        WHERE b.client_id = ?
        ORDER BY b.created_at DESC
      `, [clientId]);
      
      console.table(allBookings);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkBooking();
