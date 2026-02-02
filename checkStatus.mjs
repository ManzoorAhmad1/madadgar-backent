import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'madadgar_db'
});

const [rows] = await connection.query(
  'SELECT booking_id, status, completed_by, received_amount FROM bookings ORDER BY id DESC LIMIT 1'
);

console.log('\n📊 Latest Booking:');
console.table(rows);

await connection.end();
