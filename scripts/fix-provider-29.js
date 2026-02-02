import pool from '../config/database.js';

/**
 * Fix Provider ID 29 - Add location and approve
 */
const fixProvider = async () => {
  try {
    const providerId = 29;
    console.log(`🔧 Fixing Provider ID ${providerId}...\n`);

    // Get current details
    const [rows] = await pool.query('SELECT provider_details FROM users WHERE id = ?', [providerId]);
    
    if (rows.length === 0) {
      console.log('❌ Provider not found');
      process.exit(1);
    }

    let details = rows[0].provider_details;
    if (typeof details === 'string') {
      details = JSON.parse(details);
    }

    // Update with required fields
    const updatedDetails = {
      ...details,
      approved: true,
      isAvailable: true,
      documentStatus: 'approved',
      location: {
        lat: 33.6844,
        lng: 73.0479,
        address: 'Islamabad, Pakistan'
      },
      rating: {
        average: 4.5,
        count: 0
      },
      hourlyRate: details.hourlyRate || 500,
      bio: details.bio || 'Professional service provider',
      totalEarnings: 0,
      completedJobs: 0
    };

    // Update in database
    await pool.query(
      'UPDATE users SET provider_details = ?, is_active = 1, is_verified = 1 WHERE id = ?',
      [JSON.stringify(updatedDetails), providerId]
    );

    console.log('✅ Provider updated successfully!\n');
    console.log('Updated fields:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ approved: ${updatedDetails.approved}`);
    console.log(`✅ isAvailable: ${updatedDetails.isAvailable}`);
    console.log(`✅ documentStatus: ${updatedDetails.documentStatus}`);
    console.log(`✅ location: ${JSON.stringify(updatedDetails.location)}`);
    console.log(`✅ rating: ${JSON.stringify(updatedDetails.rating)}`);
    console.log(`✅ hourlyRate: Rs.${updatedDetails.hourlyRate}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎯 Provider should now be visible in search!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixProvider();
