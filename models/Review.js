import pool from '../config/database.js';

class Review {
  // Create review
  static async create(reviewData) {
    const {
      booking_id,
      client_id,
      provider_id,
      service_category_id,
      rating,
      comment,
      images
    } = reviewData;

    const [result] = await pool.execute(
      `INSERT INTO reviews (
        booking_id, client_id, provider_id, service_category_id,
        rating, comment, images
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        booking_id,
        client_id,
        provider_id,
        service_category_id,
        rating,
        comment || null,
        images ? JSON.stringify(images) : null
      ]
    );

    return this.findById(result.insertId);
  }

  // Find by ID
  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM reviews WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) return null;
    return this.formatReview(rows[0]);
  }

  // Find by booking ID
  static async findByBookingId(bookingId) {
    const [rows] = await pool.execute(
      'SELECT * FROM reviews WHERE booking_id = ?',
      [bookingId]
    );
    
    if (rows.length === 0) return null;
    return this.formatReview(rows[0]);
  }

  // Find reviews by provider
  static async findByProviderId(providerId, filters = {}) {
    let query = 'SELECT * FROM reviews WHERE provider_id = ? AND is_visible = 1';
    const params = [providerId];

    if (filters.min_rating) {
      query += ' AND rating >= ?';
      params.push(filters.min_rating);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
      
      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(parseInt(filters.offset));
      }
    }

    const [rows] = await pool.execute(query, params);
    return rows.map(row => this.formatReview(row));
  }

  // Find reviews by client
  static async findByClientId(clientId, filters = {}) {
    let query = 'SELECT * FROM reviews WHERE client_id = ?';
    const params = [clientId];

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    const [rows] = await pool.execute(query, params);
    return rows.map(row => this.formatReview(row));
  }

  // Update review
  static async updateById(id, updates) {
    const allowedUpdates = [
      'rating', 'comment', 'images', 'provider_response',
      'is_reported', 'report_reason', 'helpful_votes', 'is_visible'
    ];

    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        updateFields.push(`${key} = ?`);
        
        if (['images', 'provider_response'].includes(key) && typeof value === 'object') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }

    if (updateFields.length === 0) return null;

    values.push(id);
    await pool.execute(
      `UPDATE reviews SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  // Delete review
  static async deleteById(id) {
    const [result] = await pool.execute(
      'DELETE FROM reviews WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // Add provider response
  static async addProviderResponse(reviewId, responseComment) {
    const providerResponse = {
      comment: responseComment,
      respondedAt: new Date()
    };

    return this.updateById(reviewId, { provider_response: providerResponse });
  }

  // Report review
  static async reportReview(reviewId, reason) {
    return this.updateById(reviewId, {
      is_reported: true,
      report_reason: reason
    });
  }

  // Increment helpful votes
  static async incrementHelpfulVotes(reviewId) {
    await pool.execute(
      'UPDATE reviews SET helpful_votes = helpful_votes + 1 WHERE id = ?',
      [reviewId]
    );
    return this.findById(reviewId);
  }

  // Get provider average rating
  static async getProviderAverageRating(providerId) {
    const [rows] = await pool.execute(
      `SELECT AVG(rating) as average, COUNT(*) as count 
       FROM reviews 
       WHERE provider_id = ? AND is_visible = 1`,
      [providerId]
    );

    return {
      average: rows[0].average ? parseFloat(rows[0].average.toFixed(1)) : 0,
      count: rows[0].count || 0
    };
  }

  // Get all reviews with filters
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM reviews WHERE 1=1';
    const params = [];

    if (filters.is_reported !== undefined) {
      query += ' AND is_reported = ?';
      params.push(filters.is_reported);
    }

    if (filters.is_visible !== undefined) {
      query += ' AND is_visible = ?';
      params.push(filters.is_visible);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
      
      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(parseInt(filters.offset));
      }
    }

    const [rows] = await pool.execute(query, params);
    return rows.map(row => this.formatReview(row));
  }

  // Format review object
  static formatReview(row) {
    if (!row) return null;

    return {
      id: row.id,
      _id: row.id, // For backward compatibility
      bookingId: row.booking_id,
      booking_id: row.booking_id,
      booking: row.booking_id,
      clientId: row.client_id,
      client_id: row.client_id,
      client: row.client_id,
      providerId: row.provider_id,
      provider_id: row.provider_id,
      provider: row.provider_id,
      serviceCategoryId: row.service_category_id,
      service_category_id: row.service_category_id,
      serviceCategory: row.service_category_id,
      rating: row.rating,
      comment: row.comment,
      images: row.images ? JSON.parse(row.images) : [],
      providerResponse: row.provider_response ? JSON.parse(row.provider_response) : null,
      provider_response: row.provider_response ? JSON.parse(row.provider_response) : null,
      isReported: row.is_reported,
      is_reported: row.is_reported,
      reportReason: row.report_reason,
      report_reason: row.report_reason,
      helpfulVotes: row.helpful_votes || 0,
      helpful_votes: row.helpful_votes || 0,
      isVisible: row.is_visible,
      is_visible: row.is_visible,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

export default Review;
