import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationFiles = [
  '001_create_users_table.sql',
  '002_create_service_categories_table.sql',
  '003_create_bookings_table.sql',
  '004_create_reviews_table.sql',
  '005_create_notifications_table.sql'
];

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');
  
  try {
    // Test connection first
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database');
    connection.release();

    // Run each migration
    for (const file of migrationFiles) {
      const filePath = join(__dirname, '../database/migrations', file);
      console.log(`📄 Running: ${file}`);
      
      try {
        const sql = readFileSync(filePath, 'utf8');
        
        // Remove comments and split by semicolon
        const cleanedSql = sql
          .split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n');
        
        // Execute the entire SQL (CREATE TABLE statement)
        await pool.query(cleanedSql);
        
        console.log(`   ✅ Success: ${file}\n`);
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`   ⚠️  Table already exists, skipping: ${file}\n`);
        } else {
          console.error(`   ❌ Error in ${file}:`, error.message);
          throw error;
        }
      }
    }

    // Show created tables
    console.log('📊 Checking created tables...');
    const [tables] = await pool.execute('SHOW TABLES');
    console.log('\n✅ Database tables:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`   - ${tableName}`);
    });

    console.log('\n🎉 All migrations completed successfully!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nPlease check:');
    console.error('1. Database credentials in .env file');
    console.error('2. Remote MySQL access enabled in Hostinger');
    console.error('3. Your IP is whitelisted in Hostinger panel\n');
    process.exit(1);
  }
}

runMigrations();
