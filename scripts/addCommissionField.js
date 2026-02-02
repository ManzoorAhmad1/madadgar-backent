import pool from '../config/database.js';

async function addCommissionField() {
  try {
    console.log('🔄 Adding commission_rate to service_categories...\n');
    
    // Add commission_rate field (percentage)
    await pool.execute(`
      ALTER TABLE service_categories 
      ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 10.00 COMMENT 'Admin commission percentage (e.g., 10.00 for 10%)'
    `);
    
    console.log('✅ Commission field added successfully!');
    console.log('\nDefault commission: 10%');
    console.log('Admin can update this per service from admin panel');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

addCommissionField();
