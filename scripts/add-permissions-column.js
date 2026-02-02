import pool from '../config/database.js';

async function addPermissionsColumn() {
  try {
    console.log('🔄 Adding permissions column to users table...');

    // Check if column already exists
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'permissions'
    `);

    if (columns.length === 0) {
      await pool.execute(`
        ALTER TABLE users 
        ADD COLUMN permissions TEXT NULL AFTER role
      `);
      console.log('✅ Added permissions column');
    } else {
      console.log('ℹ️  permissions column already exists');
    }

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addPermissionsColumn();
