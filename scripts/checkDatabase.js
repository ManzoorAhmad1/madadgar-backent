import pool from '../config/database.js';

async function checkDatabase() {
  console.log('🔍 Checking Database Structure...\n');

  try {
    // Check Users Table
    console.log('📊 USERS TABLE:');
    const [usersColumns] = await pool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      ORDER BY ORDINAL_POSITION
    `);
    console.table(usersColumns);

    const [usersCount] = await pool.execute('SELECT COUNT(*) as count FROM users');
    console.log(`Total Users: ${usersCount[0].count}\n`);

    // Check Service Categories Table
    console.log('📊 SERVICE_CATEGORIES TABLE:');
    const [categoriesColumns] = await pool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'service_categories'
      ORDER BY ORDINAL_POSITION
    `);
    console.table(categoriesColumns);

    const [categoriesCount] = await pool.execute('SELECT COUNT(*) as count FROM service_categories');
    console.log(`Total Categories: ${categoriesCount[0].count}\n`);

    // Check Bookings Table
    console.log('📊 BOOKINGS TABLE:');
    const [bookingsColumns] = await pool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      ORDER BY ORDINAL_POSITION
    `);
    console.table(bookingsColumns);

    const [bookingsCount] = await pool.execute('SELECT COUNT(*) as count FROM bookings');
    console.log(`Total Bookings: ${bookingsCount[0].count}\n`);

    // Check recent bookings
    console.log('📋 RECENT BOOKINGS (Last 5):');
    const [recentBookings] = await pool.execute(`
      SELECT 
        b.id,
        b.booking_id,
        b.client_id,
        b.provider_id,
        b.service_category_id,
        b.status,
        b.scheduled_time,
        b.created_at,
        c.name as client_name,
        p.name as provider_name,
        sc.name as service_name
      FROM bookings b
      LEFT JOIN users c ON b.client_id = c.id
      LEFT JOIN users p ON b.provider_id = p.id
      LEFT JOIN service_categories sc ON b.service_category_id = sc.id
      ORDER BY b.created_at DESC
      LIMIT 5
    `);
    console.table(recentBookings);

    // Check for missing fields
    console.log('\n✅ FIELD VALIDATION:');
    
    const requiredFields = {
      bookings: [
        'id', 'booking_id', 'client_id', 'provider_id', 'service_category_id',
        'service_description', 'location_address', 'location_coordinates',
        'scheduled_time', 'status', 'pricing', 'payment', 'tracking',
        'created_at', 'updated_at'
      ],
      users: [
        'id', 'role', 'email', 'phone', 'name', 'is_verified',
        'provider_details', 'client_details', 'created_at'
      ],
      service_categories: [
        'id', 'name', 'slug', 'icon', 'base_price', 'is_active'
      ]
    };

    // Validate bookings table
    const bookingFields = bookingsColumns.map(col => col.COLUMN_NAME);
    const missingBookingFields = requiredFields.bookings.filter(
      field => !bookingFields.includes(field)
    );
    
    if (missingBookingFields.length > 0) {
      console.log('❌ Missing fields in bookings table:', missingBookingFields);
    } else {
      console.log('✅ All required fields present in bookings table');
    }

    // Validate users table
    const userFields = usersColumns.map(col => col.COLUMN_NAME);
    const missingUserFields = requiredFields.users.filter(
      field => !userFields.includes(field)
    );
    
    if (missingUserFields.length > 0) {
      console.log('❌ Missing fields in users table:', missingUserFields);
    } else {
      console.log('✅ All required fields present in users table');
    }

    // Validate service_categories table
    const categoryFields = categoriesColumns.map(col => col.COLUMN_NAME);
    const missingCategoryFields = requiredFields.service_categories.filter(
      field => !categoryFields.includes(field)
    );
    
    if (missingCategoryFields.length > 0) {
      console.log('❌ Missing fields in service_categories table:', missingCategoryFields);
    } else {
      console.log('✅ All required fields present in service_categories table');
    }

    // Check foreign key constraints
    console.log('\n🔗 FOREIGN KEY CONSTRAINTS:');
    const [constraints] = await pool.execute(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
      AND REFERENCED_TABLE_NAME IS NOT NULL
      AND TABLE_NAME IN ('bookings', 'reviews', 'notifications')
    `);
    console.table(constraints);

    // Check indexes
    console.log('\n📇 INDEXES ON BOOKINGS TABLE:');
    const [indexes] = await pool.execute(`
      SELECT 
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        SEQ_IN_INDEX
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `);
    console.table(indexes);

    console.log('\n✅ Database check completed!');
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase();
