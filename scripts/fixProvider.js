import pool from '../config/database.js';

async function fixProvider() {
  try {
    console.log('🔧 Fixing provider status...\n');

    const providerId = 22; // ahmad's ID

    // Update provider details
    const [provider] = await pool.execute(
      'SELECT provider_details FROM users WHERE id = ?',
      [providerId]
    );

    if (provider.length === 0) {
      console.log('❌ Provider not found');
      process.exit(1);
    }

    const details = JSON.parse(provider[0].provider_details);
    
    // Update details
    details.approved = true;
    details.isAvailable = true;
    details.completedJobs = 25;
    details.experience = 5;
    details.hourlyRate = 500;
    details.rating = { average: 4.5, count: 20 };
    
    // Fix location coordinates [lng, lat]
    details.location = {
      address: 'Islamabad, Pakistan',
      coordinates: [73.0479, 33.6844]
    };

    // Update in database
    await pool.execute(
      'UPDATE users SET provider_details = ?, is_active = true WHERE id = ?',
      [JSON.stringify(details), providerId]
    );

    console.log('✅ Provider updated successfully!');
    console.log('   - Approved: true');
    console.log('   - Available: true');
    console.log('   - Active: true');
    console.log('   - Location: Islamabad');
    console.log('\n🎉 Provider is now visible to clients!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixProvider();
