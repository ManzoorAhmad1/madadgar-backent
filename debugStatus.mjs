import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

console.log('\n📋 Checking status column definition:');
const [cols] = await conn.query('SHOW COLUMNS FROM bookings WHERE Field = "status"');
console.table(cols);

console.log('\n🔍 Checking specific booking ID 31:');
const [rows] = await conn.query(
  'SELECT id, booking_id, status, CHAR_LENGTH(status) as status_length, HEX(status) as status_hex, completed_by FROM bookings WHERE id = 31'
);
console.table(rows);

console.log('\n🔧 Trying direct update on ID 31:');
const [result] = await conn.query(
  "UPDATE bookings SET status = 'work_done' WHERE id = 31"
);
console.log('Affected rows:', result.affectedRows);

console.log('\n✅ Verifying ID 31 after update:');
const [verify] = await conn.query(
  'SELECT id, booking_id, status, completed_by FROM bookings WHERE id = 31'
);
console.table(verify);

await conn.end();
