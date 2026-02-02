import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

/**
 * Seed test providers with location data
 */
const seedProviders = async () => {
  try {
    console.log('🌱 Starting provider seeding...');

    // Check if providers already exist
    const [existingProviders] = await pool.query(
      'SELECT id FROM users WHERE role = ? LIMIT 1',
      ['provider']
    );

    if (existingProviders.length > 0) {
      console.log('⚠️ Providers already exist. Updating their location data...');
      
      // Update existing providers with location and availability
      const [allProviders] = await pool.query(
        'SELECT id, provider_details FROM users WHERE role = ?',
        ['provider']
      );

      for (const provider of allProviders) {
        let providerDetails = provider.provider_details;
        
        if (typeof providerDetails === 'string') {
          providerDetails = JSON.parse(providerDetails);
        }

        // Add location if missing (Islamabad area)
        if (!providerDetails.location) {
          providerDetails.location = {
            lat: 33.6844 + (Math.random() - 0.5) * 0.1, // Random location near Islamabad
            lng: 73.0479 + (Math.random() - 0.5) * 0.1,
            address: 'Islamabad, Pakistan'
          };
        }

        // Set availability
        if (providerDetails.isAvailable === undefined) {
          providerDetails.isAvailable = true;
        }

        // Set approved status
        if (providerDetails.approved === undefined) {
          providerDetails.approved = true;
        }

        // Set document status
        if (!providerDetails.documentStatus) {
          providerDetails.documentStatus = 'approved';
        }

        // Update provider
        await pool.query(
          'UPDATE users SET provider_details = ?, is_active = ? WHERE id = ?',
          [JSON.stringify(providerDetails), true, provider.id]
        );

        console.log(`✅ Updated provider ID ${provider.id} with location and approval`);
      }

      console.log('✅ All existing providers updated!');
      return;
    }

    // Create test providers
    const testProviders = [
      {
        name: 'Ahmed Khan',
        email: 'ahmed.plumber@madadgar.com',
        phone: '+923001111111',
        password: 'Provider@123',
        serviceCategories: ['Plumber'],
        location: { lat: 33.6844, lng: 73.0479, address: 'F-7, Islamabad' },
        hourlyRate: 500,
        bio: 'Experienced plumber with 5+ years experience'
      },
      {
        name: 'Ali Electrician',
        email: 'ali.electric@madadgar.com',
        phone: '+923002222222',
        password: 'Provider@123',
        serviceCategories: ['Electrician'],
        location: { lat: 33.6944, lng: 73.0579, address: 'G-9, Islamabad' },
        hourlyRate: 600,
        bio: 'Licensed electrician, home and office repairs'
      },
      {
        name: 'Hassan Carpenter',
        email: 'hassan.carpenter@madadgar.com',
        phone: '+923003333333',
        password: 'Provider@123',
        serviceCategories: ['Carpenter'],
        location: { lat: 33.6744, lng: 73.0379, address: 'I-8, Islamabad' },
        hourlyRate: 700,
        bio: 'Furniture making and repairs specialist'
      },
      {
        name: 'Bilal AC Technician',
        email: 'bilal.ac@madadgar.com',
        phone: '+923004444444',
        password: 'Provider@123',
        serviceCategories: ['AC Repair'],
        location: { lat: 33.6644, lng: 73.0679, address: 'E-11, Islamabad' },
        hourlyRate: 800,
        bio: 'AC installation, repair and maintenance expert'
      },
      {
        name: 'Usman Painter',
        email: 'usman.painter@madadgar.com',
        phone: '+923005555555',
        password: 'Provider@123',
        serviceCategories: ['Painter'],
        location: { lat: 33.7044, lng: 73.0279, address: 'F-10, Islamabad' },
        hourlyRate: 450,
        bio: 'Interior and exterior painting services'
      }
    ];

    const salt = await bcrypt.genSalt(10);

    for (const provider of testProviders) {
      const hashedPassword = await bcrypt.hash(provider.password, salt);

      const providerDetails = {
        serviceCategories: provider.serviceCategories.map(cat => ({ name: cat, _id: cat.toLowerCase() })),
        location: provider.location,
        hourlyRate: provider.hourlyRate,
        bio: provider.bio,
        isAvailable: true,
        approved: true,
        documentStatus: 'approved',
        rating: {
          average: 4.5,
          count: 10
        },
        totalEarnings: 15000,
        completedJobs: 25
      };

      const [result] = await pool.query(
        `INSERT INTO users (name, email, phone, password, role, provider_details, is_verified, is_active, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          provider.name,
          provider.email,
          provider.phone,
          hashedPassword,
          'provider',
          JSON.stringify(providerDetails),
          true,
          true
        ]
      );

      console.log(`✅ Created provider: ${provider.name} (ID: ${result.insertId})`);
    }

    // Create test clients
    const testClients = [
      {
        name: 'Manzoor Ahmad',
        email: 'manzoor@example.com',
        phone: '+923009876543',
        password: 'Client@123'
      },
      {
        name: 'Sara Ahmed',
        email: 'sara@example.com',
        phone: '+923008765432',
        password: 'Client@123'
      }
    ];

    for (const client of testClients) {
      const hashedPassword = await bcrypt.hash(client.password, salt);

      const [result] = await pool.query(
        `INSERT INTO users (name, email, phone, password, role, is_verified, is_active, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          client.name,
          client.email,
          client.phone,
          hashedPassword,
          'client',
          true,
          true
        ]
      );

      console.log(`✅ Created client: ${client.name} (ID: ${result.insertId})`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Test data seeded successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Provider Login Credentials:');
    console.log('Email: ahmed.plumber@madadgar.com | Password: Provider@123');
    console.log('Email: ali.electric@madadgar.com | Password: Provider@123');
    console.log('\n👤 Client Login Credentials:');
    console.log('Email: manzoor@example.com | Password: Client@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding providers:', error);
    process.exit(1);
  }
};

seedProviders();
