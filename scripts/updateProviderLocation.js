import pool from '../config/database.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function updateProviderLocation() {
  try {
    console.log('🔧 Update Provider Location Script\n');

    // Get provider ID
    const providerId = await question('Enter Provider ID: ');
    
    if (!providerId) {
      console.log('❌ Provider ID is required');
      rl.close();
      process.exit(1);
    }

    // Get new coordinates
    const lat = await question('Enter Latitude (e.g., 33.6844): ');
    const lng = await question('Enter Longitude (e.g., 73.0479): ');

    if (!lat || !lng) {
      console.log('❌ Both latitude and longitude are required');
      rl.close();
      process.exit(1);
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      console.log('❌ Invalid coordinates');
      rl.close();
      process.exit(1);
    }

    // Fetch provider
    const [providers] = await pool.execute(
      'SELECT id, name, provider_details FROM users WHERE id = ? AND role = ?',
      [providerId, 'provider']
    );

    if (providers.length === 0) {
      console.log(`❌ Provider with ID ${providerId} not found`);
      rl.close();
      process.exit(1);
    }

    const provider = providers[0];
    const providerDetails = provider.provider_details 
      ? JSON.parse(provider.provider_details) 
      : {};

    console.log(`\nUpdating location for: ${provider.name}`);

    // Update location
    providerDetails.location = {
      type: 'Point',
      coordinates: [longitude, latitude],
      lat: latitude,
      lng: longitude,
      address: `Updated Location (${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E)`
    };

    // Save to database
    await pool.execute(
      'UPDATE users SET provider_details = ? WHERE id = ?',
      [JSON.stringify(providerDetails), providerId]
    );

    console.log('✅ Location updated successfully!');
    console.log(`New Location: ${latitude}, ${longitude}`);

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    rl.close();
    process.exit(1);
  }
}

updateProviderLocation();
