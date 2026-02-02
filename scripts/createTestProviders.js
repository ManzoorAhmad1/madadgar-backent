import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

async function createTestProviders() {
  try {
    console.log('🔧 Creating test providers...\n');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const providers = [
      {
        name: 'Ali Khan',
        email: 'ali.electrician@example.com',
        phone: '+923001234567',
        role: 'provider',
        avatar: 'https://ui-avatars.com/api/?name=Ali+Khan&background=4F46E5&color=fff',
        providerDetails: {
          approved: true,
          isAvailable: true,
          serviceCategories: [
            { _id: '1', name: 'Electrician', icon: '⚡', basePrice: 500 }
          ],
          location: {
            address: 'F-7 Markaz, Islamabad',
            coordinates: [73.0479, 33.6844]
          },
          hourlyRate: 500,
          completedJobs: 45,
          experience: 8,
          rating: { average: 4.7, count: 38 },
          bio: 'Expert electrician with 8 years experience'
        }
      },
      {
        name: 'Ahmed Raza',
        email: 'ahmed.plumber@example.com',
        phone: '+923002345678',
        role: 'provider',
        avatar: 'https://ui-avatars.com/api/?name=Ahmed+Raza&background=10B981&color=fff',
        providerDetails: {
          approved: true,
          isAvailable: true,
          serviceCategories: [
            { _id: '2', name: 'Plumber', icon: '🔧', basePrice: 600 }
          ],
          location: {
            address: 'G-9 Markaz, Islamabad',
            coordinates: [73.0579, 33.6944]
          },
          hourlyRate: 600,
          completedJobs: 62,
          experience: 10,
          rating: { average: 4.9, count: 55 },
          bio: 'Professional plumber, available 24/7'
        }
      },
      {
        name: 'Sara Ali',
        email: 'sara.teacher@example.com',
        phone: '+923003456789',
        role: 'provider',
        avatar: 'https://ui-avatars.com/api/?name=Sara+Ali&background=EC4899&color=fff',
        providerDetails: {
          approved: true,
          isAvailable: true,
          serviceCategories: [
            { _id: '3', name: 'Home Tutor', icon: '📚', basePrice: 800 }
          ],
          location: {
            address: 'Blue Area, Islamabad',
            coordinates: [73.0679, 33.7044]
          },
          hourlyRate: 800,
          completedJobs: 120,
          experience: 12,
          rating: { average: 4.8, count: 98 },
          bio: 'Experienced home tutor for all subjects'
        }
      },
      {
        name: 'Hassan Shah',
        email: 'hassan.carpenter@example.com',
        phone: '+923004567890',
        role: 'provider',
        avatar: 'https://ui-avatars.com/api/?name=Hassan+Shah&background=F59E0B&color=fff',
        providerDetails: {
          approved: true,
          isAvailable: true,
          serviceCategories: [
            { _id: '4', name: 'Carpenter', icon: '🪚', basePrice: 700 }
          ],
          location: {
            address: 'I-8 Markaz, Islamabad',
            coordinates: [73.0379, 33.6744]
          },
          hourlyRate: 700,
          completedJobs: 85,
          experience: 15,
          rating: { average: 4.6, count: 72 },
          bio: 'Skilled carpenter for furniture and woodwork'
        }
      },
      {
        name: 'Zainab Malik',
        email: 'zainab.cleaner@example.com',
        phone: '+923005678901',
        role: 'provider',
        avatar: 'https://ui-avatars.com/api/?name=Zainab+Malik&background=8B5CF6&color=fff',
        providerDetails: {
          approved: true,
          isAvailable: true,
          serviceCategories: [
            { _id: '5', name: 'House Cleaning', icon: '🧹', basePrice: 400 }
          ],
          location: {
            address: 'F-10 Markaz, Islamabad',
            coordinates: [73.0279, 33.6944]
          },
          hourlyRate: 400,
          completedJobs: 150,
          experience: 5,
          rating: { average: 4.9, count: 142 },
          bio: 'Professional house cleaning services'
        }
      }
    ];

    for (const provider of providers) {
      // Check if user already exists
      const [existing] = await pool.execute(
        'SELECT id FROM users WHERE email = ?',
        [provider.email]
      );

      if (existing.length > 0) {
        console.log(`⏭️  Provider ${provider.name} already exists`);
        continue;
      }

      // Insert provider
      await pool.execute(
        `INSERT INTO users (
          role, name, email, phone, password, avatar, 
          provider_details, is_verified, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          provider.role,
          provider.name,
          provider.email,
          provider.phone,
          hashedPassword,
          provider.avatar,
          JSON.stringify(provider.providerDetails),
          true,
          true
        ]
      );

      console.log(`✅ Created provider: ${provider.name} (${provider.email})`);
    }

    console.log('\n🎉 Test providers created successfully!');
    console.log('\nLogin credentials for all providers:');
    console.log('Password: password123\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating providers:', error);
    process.exit(1);
  }
}

createTestProviders();
