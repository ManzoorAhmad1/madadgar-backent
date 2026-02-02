import pool from '../config/database.js';

export async function up() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check if columns already exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'reviews' 
        AND COLUMN_NAME IN ('images', 'provider_response', 'response_date')
    `);

    const existingColumns = columns.map(c => c.COLUMN_NAME);

    if (!existingColumns.includes('images')) {
      await connection.query(`
        ALTER TABLE reviews 
        ADD COLUMN images TEXT COMMENT 'JSON array of image URLs'
      `);
    }

    if (!existingColumns.includes('provider_response')) {
      await connection.query(`
        ALTER TABLE reviews 
        ADD COLUMN provider_response TEXT COMMENT 'Provider response to review'
      `);
    }

    if (!existingColumns.includes('response_date')) {
      await connection.query(`
        ALTER TABLE reviews 
        ADD COLUMN response_date TIMESTAMP NULL COMMENT 'When provider responded'
      `);
    }

    // Check users table columns
    const [userColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME IN ('average_rating', 'total_reviews')
    `);

    const existingUserColumns = userColumns.map(c => c.COLUMN_NAME);

    if (!existingUserColumns.includes('average_rating')) {
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.00 COMMENT 'Average rating from reviews'
      `);
    }

    if (!existingUserColumns.includes('total_reviews')) {
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN total_reviews INT DEFAULT 0 COMMENT 'Total number of reviews'
      `);
    }

    // Create indexes
    await connection.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews(provider_id)
    `);
    await connection.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(booking_id)
    `);
    await connection.query(`
      CREATE INDEX IF NOT EXISTS idx_users_rating ON users(average_rating)
    `);

    await connection.commit();
    console.log('✅ Review system migration completed successfully');
  } catch (error) {
    await connection.rollback();
    console.error('❌ Review system migration failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  up()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default { up };
