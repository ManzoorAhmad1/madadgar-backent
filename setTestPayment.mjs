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

console.log('\n🔧 Setting received_amount for BK-20260129-005 to test review flow...');

await conn.query(
  `UPDATE bookings 
   SET received_amount = 500.00 
   WHERE booking_id = 'BK-20260129-005'`
);

console.log('✅ Updated successfully!');

console.log('\n📊 Verifying:');
const [rows] = await conn.query(
  `SELECT 
    booking_id, 
    status, 
    negotiated_amount,
    received_amount
  FROM bookings 
  WHERE booking_id = 'BK-20260129-005'`
);
console.table(rows);

await conn.end();
