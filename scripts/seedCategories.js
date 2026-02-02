import ServiceCategory from '../models/ServiceCategory.js';
import { testConnection } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const categories = [
  {
    name: 'Electricians',
    slug: 'electricians',
    description: 'Professional electrical services for home and commercial needs',
    icon: '⚡',
    image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800',
    base_price: 500,
    pricing_rules: {
      distanceThreshold: 3,
      chargeBeyondThreshold: 300
    },
    sorting_order: 1
  },
  {
    name: 'Plumbers',
    slug: 'plumbers',
    description: 'Expert plumbing services for all your water and drainage needs',
    icon: '🔧',
    image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800',
    base_price: 500,
    pricing_rules: {
      distanceThreshold: 3,
      chargeBeyondThreshold: 300
    },
    sorting_order: 2
  },
  {
    name: 'General Labor/Technicians',
    slug: 'technicians',
    description: 'Skilled technicians for various home and office tasks',
    icon: '🛠️',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
    base_price: 400,
    pricing_rules: {
      distanceThreshold: 3,
      chargeBeyondThreshold: 300
    },
    sorting_order: 3
  },
  {
    name: 'Medical Staff',
    slug: 'medical-staff',
    description: 'Qualified doctors and nurses for home healthcare services',
    icon: '🏥',
    image: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800',
    base_price: 2000,
    pricing_rules: {
      distanceThreshold: 3,
      chargeBeyondThreshold: 1000,
      specialCharges: {
        medical: 1000
      }
    },
    sorting_order: 4
  },
  {
    name: 'Home Tutors/Teachers',
    slug: 'teachers',
    description: 'Experienced teachers for home tuition across all subjects',
    icon: '📚',
    image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800',
    base_price: 1000,
    pricing_rules: {
      distanceThreshold: 3,
      chargeBeyondThreshold: 300,
      specialCharges: {
        teacher: 300
      }
    },
    sorting_order: 5
  },
  {
    name: 'Male Salon Services',
    slug: 'male-salon',
    description: 'Professional grooming and salon services for men',
    icon: '✂️',
    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',
    base_price: 600,
    pricing_rules: {
      distanceThreshold: 3,
      chargeBeyondThreshold: 300
    },
    sorting_order: 6
  },
  {
    name: 'AC Repair Technicians',
    slug: 'ac-repair',
    description: 'Expert AC installation, repair, and maintenance services',
    icon: '❄️',
    image: 'https://images.unsplash.com/photo-1604754742629-3e5728249d73?w=800',
    base_price: 800,
    pricing_rules: {
      distanceThreshold: 3,
      chargeBeyondThreshold: 300
    },
    sorting_order: 7
  },
  {
    name: 'Carpenters',
    slug: 'carpenters',
    description: 'Skilled carpentry services for furniture and woodwork',
    icon: '🪵',
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
    base_price: 700,
    pricing_rules: {
      distanceThreshold: 3,
      chargeBeyondThreshold: 300
    },
    sorting_order: 8
  },
  {
    name: 'Painters',
    slug: 'painters',
    description: 'Professional painting services for interior and exterior',
    icon: '🎨',
    image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800',
    base_price: 600,
    pricing_rules: {
      distanceThreshold: 3,
      chargeBeyondThreshold: 300
    },
    sorting_order: 9
  },
  {
    name: 'Cleaning Services',
    slug: 'cleaning',
    description: 'Thorough cleaning services for homes and offices',
    icon: '🧹',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
    base_price: 500,
    pricing_rules: {
      distanceThreshold: 3,
      chargeBeyondThreshold: 300
    },
    sorting_order: 10
  },
  {
    name: 'Pest Control',
    slug: 'pest-control',
    description: 'Effective pest control and fumigation services',
    icon: '🐛',
    image: 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=800',
    base_price: 1500,
    pricing_rules: {
      distanceThreshold: 3,
      chargeBeyondThreshold: 300
    },
    sorting_order: 11
  },
  {
    name: 'Appliance Repair',
    slug: 'appliance-repair',
    description: 'Repair services for all household appliances',
    icon: '🔌',
    image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800',
    base_price: 600,
    pricing_rules: {
      distanceThreshold: 3,
      chargeBeyondThreshold: 300
    },
    sorting_order: 12
  }
];

async function seedCategories() {
  try {
    // Test database connection
    await testConnection();

    // Delete all existing categories
    const allCategories = await ServiceCategory.findAll();
    for (const cat of allCategories) {
      await ServiceCategory.deleteById(cat.id);
    }
    console.log('✅ Cleared existing categories');

    // Insert new categories
    for (const category of categories) {
      await ServiceCategory.create(category);
    }
    
    console.log(`✅ Successfully seeded ${categories.length} categories`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
}

seedCategories();
