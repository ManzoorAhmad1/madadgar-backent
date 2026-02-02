import mysql from 'mysql2/promise';

async function checkBookingStatus() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'madadgar_db'
    });

    const [rows] = await connection.query(
      'SELECT id, booking_id, status, received_amount, completed_by, negotiated_amount FROM bookings ORDER BY id DESC LIMIT 5'
    );

    console.log('\n📊 Recent Bookings Status:');
    console.table(rows);

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkBookingStatus();
