import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'madadgar_db',
    multipleStatements: true
  });

  try {
    console.log('🔄 Running migration: add_negotiation_fields...');

    const sql = `
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS negotiated_amount DECIMAL(10, 2) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS proposed_by VARCHAR(20) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS payment_accepted BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS completed_by JSON DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL DEFAULT NULL;
    `;

    await connection.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('Added fields:');
    console.log('  - negotiated_amount');
    console.log('  - proposed_by');
    console.log('  - payment_accepted');
    console.log('  - completed_by');
    console.log('  - completed_at');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
