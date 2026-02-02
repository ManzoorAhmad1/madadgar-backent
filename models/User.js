import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

class User {
  // Find user by ID
  static async findById(id, includePassword = false) {
    const fields = includePassword 
      ? '*' 
      : 'id, role, email, phone, name, avatar, is_verified, google_id, provider_details, client_details, fcm_token, last_active, is_active, is_banned, ban_reason, permissions, phone_otp, otp_expires, created_at, updated_at';
    
    const [rows] = await pool.execute(
      `SELECT ${fields} FROM users WHERE id = ?`,
      [id]
    );
    
    if (rows.length === 0) return null;
    return this.formatUser(rows[0]);
  }

  // Find user by email
  static async findByEmail(email, includePassword = false) {
    const fields = includePassword 
      ? '*' 
      : 'id, role, email, phone, name, avatar, is_verified, google_id, provider_details, client_details, fcm_token, last_active, is_active, is_banned, ban_reason, permissions, phone_otp, otp_expires, created_at, updated_at';
    
    const [rows] = await pool.execute(
      `SELECT ${fields} FROM users WHERE email = ?`,
      [email]
    );
    
    if (rows.length === 0) return null;
    return this.formatUser(rows[0]);
  }

  // Find user by phone
  static async findByPhone(phone, includePassword = false) {
    const fields = includePassword 
      ? '*' 
      : 'id, role, email, phone, name, avatar, is_verified, google_id, provider_details, client_details, fcm_token, last_active, is_active, is_banned, ban_reason, permissions, phone_otp, otp_expires, created_at, updated_at';
    
    const [rows] = await pool.execute(
      `SELECT ${fields} FROM users WHERE phone = ?`,
      [phone]
    );
    
    if (rows.length === 0) return null;
    return this.formatUser(rows[0]);
  }

  // Find user by email or phone
  static async findByEmailOrPhone(email, phone, includePassword = false) {
    const fields = includePassword 
      ? '*' 
      : 'id, role, email, phone, name, avatar, is_verified, google_id, provider_details, client_details, fcm_token, last_active, is_active, is_banned, ban_reason, permissions, created_at, updated_at';
    
    const [rows] = await pool.execute(
      `SELECT ${fields} FROM users WHERE email = ? OR phone = ?`,
      [email, phone]
    );
    
    if (rows.length === 0) return null;
    return this.formatUser(rows[0]);
  }

  // Create new user
  static async create(userData) {
    const {
      role,
      email,
      phone,
      password,
      name,
      avatar = null,
      googleId = null,
      providerDetails = null,
      clientDetails = null,
      is_verified = false,
      is_active = true,
      permissions = null
    } = userData;

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const [result] = await pool.execute(
      `INSERT INTO users (role, email, phone, password, name, avatar, google_id, provider_details, client_details, is_verified, is_active, permissions) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        role,
        email,
        phone,
        hashedPassword,
        name,
        avatar,
        googleId,
        providerDetails ? JSON.stringify(providerDetails) : null,
        clientDetails ? JSON.stringify(clientDetails) : null,
        is_verified,
        is_active,
        permissions
      ]
    );

    return this.findById(result.insertId);
  }

  // Update user
  static async updateById(id, updates) {
    const allowedUpdates = [
      'name', 'avatar', 'password', 'is_verified', 'verification_token',
      'phone_otp', 'otp_expires', 'provider_details', 'client_details',
      'fcm_token', 'last_active', 'is_active', 'is_banned', 'ban_reason',
      'reset_password_token', 'reset_password_expire', 'google_id'
    ];

    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        updateFields.push(`${key} = ?`);
        
        if (key === 'password' && value) {
          const salt = await bcrypt.genSalt(10);
          values.push(await bcrypt.hash(value, salt));
        } else if ((key === 'provider_details' || key === 'client_details') && typeof value === 'object') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }

    if (updateFields.length === 0) return null;

    values.push(id);
    await pool.execute(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  // Delete user
  static async deleteById(id) {
    const [result] = await pool.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // Compare password
  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Generate OTP
  static generateOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    return { otp, otpExpires };
  }

  // Update provider rating
  static async updateProviderRating(providerId, newRating) {
    const user = await this.findById(providerId);
    if (!user || user.role !== 'provider') return null;

    const providerDetails = user.provider_details || {};
    const rating = providerDetails.rating || { average: 0, count: 0 };
    
    const newAverage = ((rating?.average * rating.count) + newRating) / (rating.count + 1);
    rating.average = Math.round(newAverage * 10) / 10;
    rating.count = rating.count + 1;

    providerDetails.rating = rating;

    return this.updateById(providerId, { provider_details: providerDetails });
  }

  // Format user object (parse JSON fields)
  static formatUser(row) {
    if (!row) return null;

    return {
      id: row.id,
      _id: row.id, // For backward compatibility
      role: row.role,
      email: row.email,
      phone: row.phone,
      password: row.password,
      name: row.name,
      avatar: row.avatar,
      isVerified: row.is_verified,
      is_verified: row.is_verified,
      verificationToken: row.verification_token,
      phoneOTP: row.phone_otp,
      otpExpires: row.otp_expires,
      googleId: row.google_id,
      providerDetails: row.provider_details ? JSON.parse(row.provider_details) : null,
      provider_details: row.provider_details ? JSON.parse(row.provider_details) : null,
      clientDetails: row.client_details ? JSON.parse(row.client_details) : null,
      client_details: row.client_details ? JSON.parse(row.client_details) : null,
      fcmToken: row.fcm_token,
      lastActive: row.last_active,
      isActive: row.is_active,
      is_active: row.is_active,
      isBanned: row.is_banned,
      is_banned: row.is_banned,
      banReason: row.ban_reason,
      permissions: row.permissions,
      resetPasswordToken: row.reset_password_token,
      resetPasswordExpire: row.reset_password_expire,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  // Get all users with filters
  static async findAll(filters = {}) {
    let query = 'SELECT *';
    const params = [];

    // Add distance calculation if lat/lng provided
    if (filters.lat && filters.lng) {
      query += `, (
        6371 * acos(
          cos(radians(?)) * cos(radians(JSON_EXTRACT(provider_details, "$.location.lat"))) *
          cos(radians(JSON_EXTRACT(provider_details, "$.location.lng")) - radians(?)) +
          sin(radians(?)) * sin(radians(JSON_EXTRACT(provider_details, "$.location.lat")))
        )
      ) AS distance`;
      params.push(parseFloat(filters.lat), parseFloat(filters.lng), parseFloat(filters.lat));
    }

    query += ' FROM users WHERE 1=1';

    if (filters.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }

    if (filters.isVerified !== undefined) {
      query += ' AND is_verified = ?';
      params.push(filters.isVerified);
    }

    if (filters.isActive !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.isActive);
    }

    // Provider-specific filters
    if (filters.role === 'provider') {
      // Filter providers with location data
      if (filters.lat && filters.lng) {
        query += ' AND JSON_EXTRACT(provider_details, "$.location.lat") IS NOT NULL';
        query += ' AND JSON_EXTRACT(provider_details, "$.location.lng") IS NOT NULL';
      }

      if (filters.approved !== undefined) {
        query += ' AND JSON_EXTRACT(provider_details, "$.approved") = ?';
        params.push(filters.approved);
      }

      if (filters.isAvailable !== undefined) {
        query += ' AND JSON_EXTRACT(provider_details, "$.isAvailable") = ?';
        params.push(filters.isAvailable);
      }

      if (filters.category) {
        query += ' AND JSON_CONTAINS(JSON_EXTRACT(provider_details, "$.serviceCategories"), ?)';
        params.push(JSON.stringify({ _id: filters.category }));
      }

      if (filters.minRating) {
        query += ' AND JSON_EXTRACT(provider_details, "$.rating.average") >= ?';
        params.push(parseFloat(filters.minRating));
      }
    }

    // Distance filter
    if (filters.lat && filters.lng && filters.radius) {
      query += ' HAVING distance <= ?';
      params.push(parseFloat(filters.radius));
    }

    // Sorting
    if (filters.sortBy === 'distance' && filters.lat && filters.lng) {
      query += ' ORDER BY distance ASC';
    } else if (filters.sortBy === 'rating') {
      query += ' ORDER BY JSON_EXTRACT(provider_details, "$.rating.average") DESC';
    } else {
      query += ' ORDER BY created_at DESC';
    }

    if (filters.limit) {
      const offset = ((filters.page || 1) - 1) * filters.limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), offset);
    }

    console.log('🔍 Provider Query:', query);
    console.log('🔍 Query Params:', params);

    const [rows] = await pool.execute(query, params);
    
    console.log('✅ Found providers:', rows.length);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams = [];
    
    if (filters.role) {
      countQuery += ' AND role = ?';
      countParams.push(filters.role);
    }
    
    if (filters.role === 'provider') {
      if (filters.lat && filters.lng) {
        countQuery += ' AND JSON_EXTRACT(provider_details, "$.location.lat") IS NOT NULL';
        countQuery += ' AND JSON_EXTRACT(provider_details, "$.location.lng") IS NOT NULL';
      }
      
      if (filters.approved !== undefined) {
        countQuery += ' AND JSON_EXTRACT(provider_details, "$.approved") = ?';
        countParams.push(filters.approved);
      }
      
      if (filters.isAvailable !== undefined) {
        countQuery += ' AND JSON_EXTRACT(provider_details, "$.isAvailable") = ?';
        countParams.push(filters.isAvailable);
      }
    }
    
    const [countRows] = await pool.execute(countQuery, countParams);
    const total = countRows[0].total;

    return {
      users: rows.map(row => this.formatUser(row)),
      total
    };
  }

  // Delete user by ID
  static async deleteById(id) {
    const [result] = await pool.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}

export default User;
