import pool from '../config/database.js';

/**
 * Check database schema and provider_details structure
 */
const checkSchema = async () => {
  try {
    console.log('🔍 Checking database schema...\n');

    // Check users table structure
    const [columns] = await pool.query('DESCRIBE users');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 USERS TABLE COLUMNS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    columns.forEach(col => {
      console.log(`${col.Field.padEnd(25)} | ${col.Type.padEnd(20)} | ${col.Null === 'YES' ? '✅ NULL' : '❌ NOT NULL'}`);
    });

    // Check if provider_details exists
    const hasProviderDetails = columns.find(col => col.Field === 'provider_details');
    
    if (hasProviderDetails) {
      console.log('\n✅ provider_details field exists (JSON type)');
      
      // Sample provider_details structure
      const [providers] = await pool.query(
        'SELECT id, name, provider_details FROM users WHERE role = ? LIMIT 3',
        ['provider']
      );

      if (providers.length > 0) {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📦 SAMPLE PROVIDER_DETAILS STRUCTURE:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        providers.forEach(p => {
          console.log(`\nProvider ID ${p.id} (${p.name}):`);
          let details = p.provider_details;
          if (typeof details === 'string') {
            details = JSON.parse(details);
          }
          
          const fields = [
            'approved',
            'isAvailable',
            'documentStatus',
            'location',
            'serviceCategories',
            'hourlyRate',
            'rating',
            'bio'
          ];

          fields.forEach(field => {
            const exists = details && details[field] !== undefined;
            console.log(`  ${field.padEnd(20)}: ${exists ? '✅ ' + JSON.stringify(details[field]).substring(0, 50) : '❌ Missing'}`);
          });
        });
      } else {
        console.log('\n⚠️ No providers found in database');
      }
    } else {
      console.log('\n❌ provider_details field NOT found!');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Schema check complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkSchema();
