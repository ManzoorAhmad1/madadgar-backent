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

console.log('\n📋 Checking completed_by field...');
const [cols] = await conn.query('SHOW COLUMNS FROM bookings LIKE "completed_by"');
console.table(cols);

console.log('\n📊 All Recent Bookings with Full Details:');
const [rows] = await conn.query(
  `SELECT 
    id, 
    booking_id, 
    status, 
    completed_by, 
    received_amount,
    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as created
  FROM bookings 
  ORDER BY id DESC 
  LIMIT 5`
);
console.table(rows);

console.log('\n🔍 Distinct Status Values in Database:');
const [statuses] = await conn.query(
  `SELECT DISTINCT status, COUNT(*) as count 
   FROM bookings 
   GROUP BY status`
);
console.table(statuses);

await conn.end();
