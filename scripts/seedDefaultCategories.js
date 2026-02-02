import dotenv from 'dotenv';
import ServiceCategory from '../models/ServiceCategory.js';

dotenv.config();

const DEFAULT_CATEGORIES = [
  { name: 'Skilled Workforce Services', slug: 'skilled-workforce', icon: '🛠️', description: 'Labor, Plumber, electrician etc', base_price: 500 },
  { name: 'Household Domestic Staff', slug: 'household-domestic-staff', icon: '🏠', description: 'Cook, Guard, Driver, Gardner etc', base_price: 400 },
  { name: 'Construction & Building Experts', slug: 'construction-building', icon: '🏗️', description: 'Contractors etc', base_price: 1000 },
  { name: 'Personal & Commercial Services', slug: 'personal-commercial', icon: '💼', description: 'Umrah Services, Property Dealers, Matchmakers etc', base_price: 600 },
  { name: 'Medical, IT & Education Professionals', slug: 'medical-it-education', icon: '🏥', description: 'Teachers, Medical Staff, IT Expert etc', base_price: 800 },
  { name: 'Celebrations & Life Style', slug: 'celebrations-lifestyle', icon: '🎉', description: 'Event Management, Salon, Photographers etc', base_price: 700 }
];

async function seed() {
  try {
    console.log('Checking existing categories...');
    const existing = await ServiceCategory.findAll({ is_active: true });
    if (existing && existing.length > 0) {
      console.log('Categories already exist, skipping seeding. Count:', existing.length);
      process.exit(0);
    }

    console.log('Seeding default categories...');
    for (const cat of DEFAULT_CATEGORIES) {
      await ServiceCategory.create({
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        base_price: cat.base_price,
        is_active: true
      });
      console.log('Created category:', cat.name);
    }

    console.log('Seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
