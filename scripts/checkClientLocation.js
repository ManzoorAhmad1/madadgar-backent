import pool from '../config/database.js';

async function checkClientLocation() {
  try {
    console.log('🔍 Checking client locations...\n');

    const [clients] = await pool.execute(
      `SELECT id, name, email, role, client_details 
       FROM users 
       WHERE role = 'client' 
       ORDER BY id`
    );

    console.log(`Found ${clients.length} clients:\n`);

    for (const client of clients) {
      const details = client.client_details 
        ? JSON.parse(client.client_details) 
        : null;

      console.log(`Client ID: ${client.id}`);
      console.log(`Name: ${client.name}`);
      console.log(`Email: ${client.email}`);
      
      if (details?.savedLocations && details.savedLocations.length > 0) {
        console.log(`Saved Locations:`);
        details.savedLocations.forEach((loc, idx) => {
          console.log(`  ${idx + 1}. ${loc.address || 'N/A'}`);
          console.log(`     Lat: ${loc.lat || 'N/A'}, Lng: ${loc.lng || 'N/A'}`);
        });
      } else {
        console.log(`Saved Locations: None`);
      }
      
      if (details?.lastLocation) {
        const loc = details.lastLocation;
        console.log(`Last Location:`);
        console.log(`  - Address: ${loc.address || 'N/A'}`);
        console.log(`  - Lat: ${loc.lat || 'N/A'}`);
        console.log(`  - Lng: ${loc.lng || 'N/A'}`);
      } else {
        console.log(`Last Location: Not set`);
      }
      
      console.log('---\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkClientLocation();
