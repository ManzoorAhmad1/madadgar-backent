import pool from '../config/database.js';

async function checkProviders() {
  try {
    console.log('🔍 Checking providers in database...\n');

    const [providers] = await pool.execute(
      `SELECT id, name, email, role, 
       JSON_EXTRACT(provider_details, '$.approved') as approved,
       JSON_EXTRACT(provider_details, '$.isAvailable') as isAvailable,
       provider_details
       FROM users 
       WHERE role = 'provider'
       LIMIT 10`
    );

    console.log(`Found ${providers.length} providers:\n`);

    providers.forEach((p, index) => {
      console.log(`${index + 1}. ${p.name} (${p.email})`);
      console.log(`   ID: ${p.id}`);
      console.log(`   Approved: ${p.approved}`);
      console.log(`   Available: ${p.isAvailable}`);
      console.log(`   Provider Details:`, p.provider_details ? JSON.parse(p.provider_details) : 'NULL');
      console.log('');
    });

    // Check filters
    console.log('\n🔍 Testing provider query with filters...\n');
    
    const [filtered] = await pool.execute(
      `SELECT id, name, email,
       JSON_EXTRACT(provider_details, '$.approved') as approved,
       JSON_EXTRACT(provider_details, '$.isAvailable') as isAvailable
       FROM users 
       WHERE role = 'provider'
       AND JSON_EXTRACT(provider_details, '$.approved') = true
       AND JSON_EXTRACT(provider_details, '$.isAvailable') = true
       AND is_active = true`
    );

    console.log(`Filtered providers (approved + available + active): ${filtered.length}`);
    filtered.forEach((p, index) => {
      console.log(`${index + 1}. ${p.name} - Approved: ${p.approved}, Available: ${p.isAvailable}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkProviders();
