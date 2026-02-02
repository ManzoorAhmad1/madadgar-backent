import pool from '../config/database.js';

async function checkProviderLocation() {
  try {
    console.log('🔍 Checking provider locations...\n');

    const [providers] = await pool.execute(
      `SELECT id, name, email, role, provider_details 
       FROM users 
       WHERE role = 'provider' 
       ORDER BY id`
    );

    console.log(`Found ${providers.length} providers:\n`);

    for (const provider of providers) {
      const details = provider.provider_details 
        ? JSON.parse(provider.provider_details) 
        : null;

      console.log(`Provider ID: ${provider.id}`);
      console.log(`Name: ${provider.name}`);
      console.log(`Email: ${provider.email}`);
      console.log(`Available: ${details?.isAvailable || false}`);
      
      if (details?.location) {
        const loc = details.location;
        console.log(`Location:`);
        console.log(`  - Lat: ${loc.lat || 'N/A'}`);
        console.log(`  - Lng: ${loc.lng || 'N/A'}`);
        console.log(`  - Coordinates: [${loc.coordinates ? loc.coordinates.join(', ') : 'N/A'}]`);
        console.log(`  - Address: ${loc.address || 'N/A'}`);
        
        // Check if default location [0, 0]
        if (loc.coordinates && loc.coordinates[0] === 0 && loc.coordinates[1] === 0) {
          console.log(`  ⚠️  WARNING: Default location [0, 0] detected!`);
        }
      } else {
        console.log(`Location: ❌ Not set`);
      }
      
      console.log('---\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkProviderLocation();
