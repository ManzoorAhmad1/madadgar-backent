import db from '../config/database.js';

async function addReceivedAmountColumn() {
  try {
    console.log('Adding received_amount column to bookings table...');
    
    const query = `
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS received_amount DECIMAL(10, 2) DEFAULT NULL 
      COMMENT 'Actual amount received by provider from client'
    `;
    
    await db.query(query);
    
    console.log('✅ Successfully added received_amount column');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding received_amount column:', error);
    process.exit(1);
  }
}

addReceivedAmountColumn();
