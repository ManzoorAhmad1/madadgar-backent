import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🔄 Running price negotiation migration...\n');
    
    // Add negotiation fields
    await pool.execute(`
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS negotiation JSON DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS service_charges DECIMAL(10,2) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS final_agreed_amount DECIMAL(10,2) DEFAULT NULL
    `);
    
    console.log('✅ Migration completed successfully!');
    console.log('\nNew fields added:');
    console.log('  - negotiation (JSON)');
    console.log('  - service_charges (DECIMAL)');
    console.log('  - final_agreed_amount (DECIMAL)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    process.exit(0);
  }
}

runMigration();
