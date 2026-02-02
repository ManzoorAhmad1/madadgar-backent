import pool from '../config/database.js';

async function fixProviderCoordinates() {
  try {
    console.log('🔧 Fixing provider coordinates...\n');

    const [providers] = await pool.execute(
      `SELECT id, name, email, provider_details 
       FROM users 
       WHERE role = 'provider'`
    );

    console.log(`Found ${providers.length} providers to check\n`);

    let fixedCount = 0;

    for (const provider of providers) {
      const details = provider.provider_details 
        ? JSON.parse(provider.provider_details) 
        : null;

      if (!details || !details.location) {
        console.log(`⏭️  Provider ${provider.id} (${provider.name}): No location data`);
        continue;
      }

      const loc = details.location;
      let needsUpdate = false;

      // Check if coordinates array is missing or invalid
      if (!loc.coordinates || loc.coordinates.length !== 2 || 
          loc.coordinates[0] === 0 && loc.coordinates[1] === 0) {
        
        // If we have lat/lng, create coordinates array
        if (loc.lat && loc.lng && loc.lat !== 0 && loc.lng !== 0) {
          console.log(`🔧 Fixing Provider ${provider.id} (${provider.name})`);
          console.log(`   Old: coordinates = ${JSON.stringify(loc.coordinates || 'N/A')}`);
          
          details.location.coordinates = [loc.lng, loc.lat]; // [longitude, latitude]
          details.location.type = 'Point';
          
          console.log(`   New: coordinates = [${loc.lng}, ${loc.lat}]`);
          needsUpdate = true;
        } 
        // If no lat/lng but coordinates exist with valid values
        else if (loc.coordinates && loc.coordinates[0] !== 0 && loc.coordinates[1] !== 0) {
          console.log(`✅ Provider ${provider.id} (${provider.name}): Already has valid coordinates`);
        }
        else {
          console.log(`⚠️  Provider ${provider.id} (${provider.name}): Has default [0,0] location`);
        }
      } else {
        console.log(`✅ Provider ${provider.id} (${provider.name}): Already has valid coordinates`);
      }

      if (needsUpdate) {
        await pool.execute(
          'UPDATE users SET provider_details = ? WHERE id = ?',
          [JSON.stringify(details), provider.id]
        );
        fixedCount++;
        console.log(`   ✅ Updated!\n`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total providers checked: ${providers.length}`);
    console.log(`   Providers fixed: ${fixedCount}`);
    console.log(`\n✅ Done!`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixProviderCoordinates();
