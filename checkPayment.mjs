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

console.log('\n📊 Recent work_done bookings with payment info:');
const [rows] = await conn.query(
  `SELECT 
    booking_id, 
    status, 
    completed_by,
    negotiated_amount,
    received_amount,
    DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i') as updated
  FROM bookings 
  WHERE status = 'work_done'
  ORDER BY id DESC 
  LIMIT 5`
);
console.table(rows);

console.log('\n🔍 Checking received_amount column definition:');
const [cols] = await conn.query('SHOW COLUMNS FROM bookings LIKE "received_amount"');
console.table(cols);

await conn.end();
