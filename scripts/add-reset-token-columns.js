import pool from '../config/database.js';

async function addResetTokenColumns() {
  try {
    console.log('🔄 Adding reset_token and reset_token_expires columns to users table...');

    // Check if columns already exist
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME IN ('reset_token', 'reset_token_expires')
    `);

    const existingColumns = columns.map(col => col.COLUMN_NAME);

    if (!existingColumns.includes('reset_token')) {
      await pool.execute(`
        ALTER TABLE users 
        ADD COLUMN reset_token VARCHAR(100) NULL AFTER phone_otp
      `);
      console.log('✅ Added reset_token column');
    } else {
      console.log('ℹ️  reset_token column already exists');
    }

    if (!existingColumns.includes('reset_token_expires')) {
      await pool.execute(`
        ALTER TABLE users 
        ADD COLUMN reset_token_expires DATETIME NULL AFTER reset_token
      `);
      console.log('✅ Added reset_token_expires column');
    } else {
      console.log('ℹ️  reset_token_expires column already exists');
    }

    // Add index for faster lookups
    const [indexes] = await pool.execute(`
      SHOW INDEX FROM users WHERE Key_name = 'idx_reset_token'
    `);

    if (indexes.length === 0) {
      await pool.execute(`
        CREATE INDEX idx_reset_token ON users(reset_token)
      `);
      console.log('✅ Added index on reset_token column');
    } else {
      console.log('ℹ️  Index on reset_token already exists');
    }

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addResetTokenColumns();
