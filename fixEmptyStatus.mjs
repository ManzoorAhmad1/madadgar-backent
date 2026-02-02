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

console.log('\n🔍 Finding bookings with empty status and completed_by data...');
const [bookings] = await conn.query(
  `SELECT id, booking_id, status, completed_by 
   FROM bookings 
   WHERE status = '' AND completed_by IS NOT NULL`
);

console.log(`Found ${bookings.length} bookings with empty status:`);
console.table(bookings);

if (bookings.length > 0) {
  console.log('\n🔧 Fixing status to work_done...');
  
  for (const booking of bookings) {
    const completedBy = JSON.parse(booking.completed_by);
    
    // If both provider and client marked complete, set status to work_done
    if (completedBy.includes('provider') && completedBy.includes('client')) {
      await conn.query(
        'UPDATE bookings SET status = ? WHERE id = ?',
        ['work_done', booking.id]
      );
      console.log(`✅ Updated ${booking.booking_id} to work_done`);
    } else {
      // If only one party marked, set to in_progress
      await conn.query(
        'UPDATE bookings SET status = ? WHERE id = ?',
        ['in_progress', booking.id]
      );
      console.log(`✅ Updated ${booking.booking_id} to in_progress`);
    }
  }
  
  console.log('\n✨ All bookings fixed!');
} else {
  console.log('\n✨ No bookings need fixing.');
}

await conn.end();
