import pool from '../config/database.js';

class ServiceCategory {
  // Find by ID
  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM service_categories WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) return null;
    return this.formatCategory(rows[0]);
  }

  // Find by slug
  static async findBySlug(slug) {
    const [rows] = await pool.execute(
      'SELECT * FROM service_categories WHERE slug = ?',
      [slug]
    );
    
    if (rows.length === 0) return null;
    return this.formatCategory(rows[0]);
  }

  // Create category
  static async create(categoryData) {
    const {
      name,
      slug,
      description,
      icon,
      image,
      base_price,
      pricing_rules,
      requirements,
      is_active = true,
      sorting_order = 0
    } = categoryData;

    const [result] = await pool.execute(
      `INSERT INTO service_categories (
        name, slug, description, icon, image, base_price,
        pricing_rules, requirements, is_active, sorting_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        slug,
        description,
        icon,
        image,
        base_price,
        JSON.stringify(pricing_rules || {}),
        JSON.stringify(requirements || {}),
        is_active,
        sorting_order
      ]
    );

    return this.findById(result.insertId);
  }

  // Update category
  static async updateById(id, updates) {
    const allowedUpdates = [
      'name', 'slug', 'description', 'icon', 'image', 'base_price',
      'pricing_rules', 'requirements', 'is_active', 'sorting_order',
      'providers_count', 'bookings_count'
    ];

    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        updateFields.push(`${key} = ?`);
        
        if (['pricing_rules', 'requirements'].includes(key) && typeof value === 'object') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }

    if (updateFields.length === 0) return null;

    values.push(id);
    await pool.execute(
      `UPDATE service_categories SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  // Delete category
  static async deleteById(id) {
    const [result] = await pool.execute(
      'DELETE FROM service_categories WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // Get all categories
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM service_categories WHERE 1=1';
    const params = [];

    if (filters.is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.is_active);
    }

    query += ' ORDER BY sorting_order ASC, name ASC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    const [rows] = await pool.execute(query, params);
    return rows.map(row => this.formatCategory(row));
  }

  // Search categories
  static async search(searchTerm) {
    const [rows] = await pool.execute(
      `SELECT * FROM service_categories 
       WHERE (name LIKE ? OR description LIKE ?) AND is_active = 1
       ORDER BY sorting_order ASC`,
      [`%${searchTerm}%`, `%${searchTerm}%`]
    );
    
    return rows.map(row => this.formatCategory(row));
  }

  // Increment providers count
  static async incrementProvidersCount(id) {
    await pool.execute(
      'UPDATE service_categories SET providers_count = providers_count + 1 WHERE id = ?',
      [id]
    );
  }

  // Decrement providers count
  static async decrementProvidersCount(id) {
    await pool.execute(
      'UPDATE service_categories SET providers_count = GREATEST(0, providers_count - 1) WHERE id = ?',
      [id]
    );
  }

  // Increment bookings count
  static async incrementBookingsCount(id) {
    await pool.execute(
      'UPDATE service_categories SET bookings_count = bookings_count + 1 WHERE id = ?',
      [id]
    );
  }

  // Format category object
  static formatCategory(row) {
    if (!row) return null;

    return {
      id: row.id,
      _id: row.id, // For backward compatibility
      name: row.name,
      slug: row.slug,
      description: row.description,
      icon: row.icon,
      image: row.image,
      basePrice: row.base_price,
      base_price: row.base_price,
      pricingRules: row.pricing_rules ? JSON.parse(row.pricing_rules) : null,
      pricing_rules: row.pricing_rules ? JSON.parse(row.pricing_rules) : null,
      requirements: row.requirements ? JSON.parse(row.requirements) : null,
      isActive: row.is_active,
      is_active: row.is_active,
      sortingOrder: row.sorting_order,
      sorting_order: row.sorting_order,
      providersCount: row.providers_count || 0,
      providers_count: row.providers_count || 0,
      bookingsCount: row.bookings_count || 0,
      bookings_count: row.bookings_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

export default ServiceCategory;
