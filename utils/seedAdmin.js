import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

/**
 * Create default admin user if none exists
 * Reads credentials from environment variables
 */
export const seedAdminUser = async () => {
  try {
    // Check if admin user exists
    const [admins] = await pool.query(
      'SELECT id FROM users WHERE role = ? LIMIT 1',
      ['admin']
    );

    if (admins.length > 0) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Create default admin user from environment variables
    const defaultAdmin = {
      name: 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@madadgar360.com',
      phone: '+923001234567',
      password: process.env.ADMIN_PASSWORD || 'Admin@123',
      role: 'admin',
    };

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultAdmin.password, salt);

    // Insert admin user
    const [result] = await pool.query(
      `INSERT INTO users (name, email, phone, password, role, is_verified, is_active, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        defaultAdmin.name,
        defaultAdmin.email,
        defaultAdmin.phone,
        hashedPassword,
        defaultAdmin.role,
        true, // is_verified
        true, // is_active
      ]
    );

    console.log('✅ Default admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    ', defaultAdmin.email);
    console.log('🔑 Password: ', defaultAdmin.password);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  Please change the password after first login!');
    console.log('');

    return result;
  } catch (error) {
    console.error('❌ Error seeding admin user:', error.message);
    throw error;
  }
};

export default seedAdminUser;
