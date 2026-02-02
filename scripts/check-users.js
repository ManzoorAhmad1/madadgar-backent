import pool from '../config/database.js';

/**
 * Check all users in database
 */
const checkUsers = async () => {
  try {
    console.log('🔍 Checking database users...\n');

    // Get all users
    const [users] = await pool.query(
      'SELECT id, name, email, phone, role, is_active, is_verified, provider_details FROM users ORDER BY role, id'
    );

    console.log(`📊 Total Users: ${users.length}\n`);

    // Group by role
    const providers = users.filter(u => u.role === 'provider');
    const clients = users.filter(u => u.role === 'client');
    const admins = users.filter(u => u.role === 'admin');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👨‍🔧 PROVIDERS (${providers.length}):`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    providers.forEach(p => {
      let details = p.provider_details;
      if (typeof details === 'string') {
        details = JSON.parse(details);
      }
      
      console.log(`ID: ${p.id} | ${p.name} | ${p.email}`);
      console.log(`   Active: ${p.is_active ? '✅' : '❌'} | Verified: ${p.is_verified ? '✅' : '❌'}`);
      console.log(`   Available: ${details?.isAvailable ? '✅' : '❌'} | Approved: ${details?.approved ? '✅' : '❌'}`);
      console.log(`   Location: ${details?.location ? '✅ ' + JSON.stringify(details.location) : '❌ No location'}`);
      console.log(`   Categories: ${details?.serviceCategories ? details.serviceCategories.map(c => c.name).join(', ') : 'None'}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👤 CLIENTS (${clients.length}):`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    clients.forEach(c => {
      console.log(`ID: ${c.id} | ${c.name} | ${c.email}`);
      console.log(`   Active: ${c.is_active ? '✅' : '❌'} | Verified: ${c.is_verified ? '✅' : '❌'}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👨‍💼 ADMINS (${admins.length}):`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    admins.forEach(a => {
      console.log(`ID: ${a.id} | ${a.name} | ${a.email}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkUsers();
