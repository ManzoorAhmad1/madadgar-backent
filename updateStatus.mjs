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

console.log('\n🔧 Updating all empty status bookings with completed_by to work_done...');

const [result] = await conn.query(
  `UPDATE bookings 
   SET status = 'work_done' 
   WHERE status = '' 
   AND completed_by IS NOT NULL 
   AND completed_by LIKE '%provider%' 
   AND completed_by LIKE '%client%'`
);

console.log(`✅ Updated ${result.affectedRows} bookings to work_done`);

console.log('\n📊 Verifying updates:');
const [rows] = await conn.query(
  `SELECT booking_id, status, completed_by 
   FROM bookings 
   WHERE completed_by IS NOT NULL 
   ORDER BY id DESC 
   LIMIT 5`
);
console.table(rows);

await conn.end();
