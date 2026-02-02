import pool from '../config/database.js';

/**
 * Approve provider and add service categories
 */
const approveProvider = async () => {
  try {
    const providerId = 27; // Your provider ID
    
    console.log(`🔧 Approving and updating provider ID ${providerId}...\n`);

    // Get current provider details
    const [rows] = await pool.query('SELECT provider_details FROM users WHERE id = ?', [providerId]);
    
    if (rows.length === 0) {
      console.log('❌ Provider not found');
      process.exit(1);
    }

    let providerDetails = rows[0].provider_details;
    if (typeof providerDetails === 'string') {
      providerDetails = JSON.parse(providerDetails);
    }

    // Update provider details
    providerDetails.approved = true;
    providerDetails.documentStatus = 'approved';
    providerDetails.isAvailable = true;
    
    // Add service categories if missing
    if (!providerDetails.serviceCategories || providerDetails.serviceCategories.length === 0) {
      providerDetails.serviceCategories = [
        { name: 'Plumber', _id: 'plumber' },
        { name: 'Electrician', _id: 'electrician' },
        { name: 'Carpenter', _id: 'carpenter' }
      ];
    }

    // Add other required fields
    if (!providerDetails.hourlyRate) {
      providerDetails.hourlyRate = 500;
    }

    if (!providerDetails.bio) {
      providerDetails.bio = 'Professional service provider with experience';
    }

    if (!providerDetails.rating) {
      providerDetails.rating = {
        average: 4.5,
        count: 0
      };
    }

    // Update in database
    await pool.query(
      'UPDATE users SET provider_details = ?, is_active = ?, is_verified = ? WHERE id = ?',
      [JSON.stringify(providerDetails), true, true, providerId]
    );

    console.log('✅ Provider updated successfully!\n');
    console.log('Updated Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Approved: ${providerDetails.approved}`);
    console.log(`✅ Available: ${providerDetails.isAvailable}`);
    console.log(`✅ Document Status: ${providerDetails.documentStatus}`);
    console.log(`✅ Location: ${JSON.stringify(providerDetails.location)}`);
    console.log(`✅ Categories: ${providerDetails.serviceCategories.map(c => c.name).join(', ')}`);
    console.log(`✅ Hourly Rate: Rs.${providerDetails.hourlyRate}`);
    console.log(`✅ Rating: ${providerDetails.rating.average}/5 (${providerDetails.rating.count} reviews)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

approveProvider();
