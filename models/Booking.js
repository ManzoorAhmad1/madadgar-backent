import pool from '../config/database.js';

class Booking {
  // Generate booking ID
  static async generateBookingId() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as count FROM bookings 
       WHERE DATE(created_at) = CURDATE()`
    );
    
    const count = rows[0].count || 0;
    return `BK-${dateStr}-${String(count + 1).padStart(3, '0')}`;
  }

  // Create booking
  static async create(bookingData) {
    const bookingId = await this.generateBookingId();
    
    const {
      client_id,
      provider_id,
      service_category_id,
      service_description,
      location_address,
      location_coordinates,
      scheduled_time,
      pricing,
      payment,
      notes
    } = bookingData;

    const [result] = await pool.execute(
      `INSERT INTO bookings (
        booking_id, client_id, provider_id, service_category_id,
        service_description, location_address, location_coordinates,
        scheduled_time, status, pricing, payment, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingId,
        client_id,
        provider_id,
        service_category_id,
        service_description,
        location_address,
        JSON.stringify(location_coordinates),
        scheduled_time,
        'pending',
        JSON.stringify(pricing),
        JSON.stringify(payment),
        notes || null
      ]
    );

    return this.findById(result.insertId);
  }

  // Find booking by ID with review data
  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT b.*, 
        r.id as review_id,
        r.rating as review_rating,
        r.comment as review_comment,
        r.images as review_images,
        r.created_at as review_created_at
      FROM bookings b
      LEFT JOIN reviews r ON b.id = r.booking_id
      WHERE b.id = ?`,
      [id]
    );
    
    if (rows.length === 0) return null;
    
    const booking = this.formatBooking(rows[0]);
    
    // Add review data if exists
    if (rows[0].review_id) {
      booking.review = {
        id: rows[0].review_id,
        rating: rows[0].review_rating,
        comment: rows[0].review_comment,
        images: rows[0].review_images ? JSON.parse(rows[0].review_images) : null,
        createdAt: rows[0].review_created_at
      };
    }
    
    return booking;
  }

  // Find booking by booking_id
  static async findByBookingId(bookingId) {
    const [rows] = await pool.execute(
      'SELECT * FROM bookings WHERE booking_id = ?',
      [bookingId]
    );
    
    if (rows.length === 0) return null;
    return this.formatBooking(rows[0]);
  }

  // Update booking
  static async updateById(id, updates) {
    const allowedUpdates = [
      'status', 'pricing', 'payment', 'tracking', 'review',
      'cancellation', 'notes', 'admin_notes', 'scheduled_time',
      'negotiated_amount', 'proposed_by', 'payment_accepted', 
      'completed_by', 'completed_at', 'received_amount'
    ];

    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        updateFields.push(`${key} = ?`);
        
        if (['pricing', 'payment', 'tracking', 'review', 'cancellation', 'completed_by'].includes(key) && typeof value === 'object') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }

    if (updateFields.length === 0) return null;

    values.push(id);
    await pool.execute(
      `UPDATE bookings SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  // Delete booking
  static async deleteById(id) {
    const [result] = await pool.execute(
      'DELETE FROM bookings WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // Find bookings by client
  static async findByClientId(clientId, filters = {}) {
    let query = `
      SELECT b.*, 
        u.name as provider_name,
        u.avatar as provider_avatar,
        u.phone as provider_phone,
        u.email as provider_email,
        sc.name as category_name,
        sc.icon as category_icon,
        sc.base_price as category_base_price
      FROM bookings b
      LEFT JOIN users u ON b.provider_id = u.id
      LEFT JOIN service_categories sc ON b.service_category_id = sc.id
      WHERE b.client_id = ?
    `;
    const params = [clientId];

    if (filters.status) {
      query += ' AND b.status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY b.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    const [rows] = await pool.execute(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM bookings WHERE client_id = ?';
    const countParams = [clientId];
    
    if (filters.status) {
      countQuery += ' AND status = ?';
      countParams.push(filters.status);
    }
    
    const [countRows] = await pool.execute(countQuery, countParams);
    const total = countRows[0].total;

    // Format bookings with provider and service category details
    const bookings = rows.map(row => {
      const booking = this.formatBooking(row);
      return {
        ...booking,
        provider: {
          id: row.provider_id,
          name: row.provider_name || 'Unknown Provider',
          avatar: row.provider_avatar,
          phone: row.provider_phone,
          email: row.provider_email
        },
        serviceCategory: {
          id: row.service_category_id,
          name: row.category_name || 'Unknown Service',
          icon: row.category_icon,
          basePrice: row.category_base_price
        }
      };
    });

    return { 
      bookings, 
      total 
    };
  }

  // Find bookings by provider
  static async findByProviderId(providerId, filters = {}) {
    let query = `
      SELECT b.*, 
        u.name as client_name,
        u.avatar as client_avatar,
        u.phone as client_phone,
        u.email as client_email,
        sc.name as category_name,
        sc.icon as category_icon,
        sc.base_price as category_base_price
      FROM bookings b
      LEFT JOIN users u ON b.client_id = u.id
      LEFT JOIN service_categories sc ON b.service_category_id = sc.id
      WHERE b.provider_id = ?
    `;
    const params = [providerId];

    if (filters.status) {
      query += ' AND b.status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY b.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    const [rows] = await pool.execute(query, params);
    
    // Format bookings with client and service category details
    const bookings = rows.map(row => {
      const booking = this.formatBooking(row);
      return {
        ...booking,
        client: {
          id: row.client_id,
          name: row.client_name || 'Unknown Client',
          avatar: row.client_avatar,
          phone: row.client_phone,
          email: row.client_email
        },
        serviceCategory: {
          id: row.service_category_id,
          name: row.category_name || 'Unknown Service',
          icon: row.category_icon,
          basePrice: row.category_base_price
        }
      };
    });
    
    return { bookings, total: rows.length };
  }

  // Find pending bookings nearby for providers based on their location
  static async findPendingBookingsNearby(providerId, providerLocation, maxDistance = 50, category = null, filters = {}) {
    let query = `
      SELECT b.*, 
        u.name as client_name,
        u.avatar as client_avatar,
        u.phone as client_phone,
        sc.name as category_name,
        sc.icon as category_icon
      FROM bookings b
      LEFT JOIN users u ON b.client_id = u.id
      LEFT JOIN service_categories sc ON b.service_category_id = sc.id
      WHERE b.status = 'pending'
    `;
    const params = [];

    if (category) {
      query += ' AND b.service_category_id = ?';
      params.push(category);
    }

    query += ' ORDER BY b.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    const [rows] = await pool.execute(query, params);
    
    // Calculate distance for each booking and filter
    const bookingsWithDistance = rows
      .map(row => {
        const booking = this.formatBooking(row);
        
        // Parse location coordinates
        let bookingCoords;
        try {
          if (typeof booking.location_coordinates === 'string') {
            bookingCoords = JSON.parse(booking.location_coordinates);
          } else {
            bookingCoords = booking.location_coordinates;
          }
        } catch (e) {
          console.error('Error parsing coordinates:', e);
          return null;
        }

        if (!bookingCoords || !Array.isArray(bookingCoords) || bookingCoords.length < 2) {
          return null;
        }

        // Calculate distance using Haversine formula
        const distance = this.calculateHaversineDistance(
          providerLocation[1], // provider lat
          providerLocation[0], // provider lng
          bookingCoords[1],    // client lat
          bookingCoords[0]     // client lng
        );

        return {
          ...booking,
          distance: distance,
          distanceUnit: 'km',
          client: {
            name: row.client_name,
            avatar: row.client_avatar,
            phone: row.client_phone
          },
          serviceCategory: {
            name: row.category_name,
            icon: row.category_icon
          }
        };
      })
      .filter(booking => booking && booking.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    return { bookings: bookingsWithDistance, total: bookingsWithDistance.length };
  }

  // Haversine distance calculation
  static calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  static toRad(deg) {
    return deg * (Math.PI / 180);
  }

  // Get all bookings with filters
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM bookings WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.service_category_id) {
      query += ' AND service_category_id = ?';
      params.push(filters.service_category_id);
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
    return rows.map(row => this.formatBooking(row));
  }

  // Calculate pricing
  // driverCharges (300) = NO COMMISSION (fuel only)
  // serviceCharges = Admin commission applies
  static calculatePricing(basePrice, distance, serviceType, commissionRate = 10) {
    const driverCharges = 300; // Fixed - No commission (fuel charges)
    const bookingAmount = parseFloat(basePrice);
    
    // Commission only on service charges (not on driver charges)
    const serviceCommission = Math.round(bookingAmount * (commissionRate / 100));
    const providerEarningFromService = bookingAmount - serviceCommission;
    
    // Provider gets: service earning + full 300 driver charges
    const totalProviderEarning = providerEarningFromService + driverCharges;
    
    // Client pays: service charges + 300 driver charges
    const totalClientPays = bookingAmount + driverCharges;
    
    return {
      baseCharge: bookingAmount, // Service charges
      driverCharges: driverCharges, // 300 (no commission)
      serviceCommission: serviceCommission, // Commission on service only
      totalCommission: serviceCommission, // Admin earns this
      totalAmount: totalClientPays, // Total client pays
      distance,
      finalAmount: totalClientPays,
      providerEarning: totalProviderEarning, // Provider gets service earning + 300
      breakdown: {
        serviceCharges: bookingAmount,
        driverFuelCharges: driverCharges,
        commissionOnService: serviceCommission,
        providerGetsFromService: providerEarningFromService,
        providerGetsFuel: driverCharges,
        totalProviderEarns: totalProviderEarning,
        adminEarns: serviceCommission
      }
    };
  }

  // Add chat message
  static async addChatMessage(bookingId, senderId, message) {
    const booking = await this.findById(bookingId);
    if (!booking) return null;

    const chatMessages = booking.chat_messages || [];
    chatMessages.push({
      sender: senderId,
      message,
      timestamp: new Date(),
      read: false
    });

    return this.updateById(bookingId, { chat_messages: chatMessages });
  }

  // Format booking object
  // Update provider location for live tracking
  static async updateProviderLocation(bookingId, location) {
    const tracking = {
      currentLocation: location,
      lastUpdated: new Date().toISOString()
    };

    await pool.execute(
      'UPDATE bookings SET tracking = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(tracking), bookingId]
    );

    return this.findById(bookingId);
  }

  static formatBooking(row) {
    if (!row) return null;

    return {
      id: row.id,
      _id: row.id, // For backward compatibility
      bookingId: row.booking_id,
      booking_id: row.booking_id,
      clientId: row.client_id,
      client_id: row.client_id,
      client: row.client_id,
      providerId: row.provider_id,
      provider_id: row.provider_id,
      provider: row.provider_id,
      serviceCategoryId: row.service_category_id,
      service_category_id: row.service_category_id,
      serviceCategory: row.service_category_id,
      serviceDescription: row.service_description,
      service_description: row.service_description,
      location: {
        address: row.location_address,
        coordinates: row.location_coordinates ? JSON.parse(row.location_coordinates) : null
      },
      scheduledTime: row.scheduled_time,
      scheduled_time: row.scheduled_time,
      status: row.status,
      pricing: row.pricing ? JSON.parse(row.pricing) : null,
      payment: row.payment ? JSON.parse(row.payment) : null,
      tracking: row.tracking ? JSON.parse(row.tracking) : null,
      review: row.review ? JSON.parse(row.review) : null,
      cancellation: row.cancellation ? JSON.parse(row.cancellation) : null,
      chatMessages: row.chat_messages ? JSON.parse(row.chat_messages) : [],
      chat_messages: row.chat_messages ? JSON.parse(row.chat_messages) : [],
      notes: row.notes,
      adminNotes: row.admin_notes,
      admin_notes: row.admin_notes,
      // Negotiation fields
      negotiatedAmount: row.negotiated_amount,
      negotiated_amount: row.negotiated_amount,
      proposedBy: row.proposed_by,
      proposed_by: row.proposed_by,
      paymentAccepted: row.payment_accepted,
      payment_accepted: row.payment_accepted,
      receivedAmount: row.received_amount,
      received_amount: row.received_amount,
      completedBy: row.completed_by ? JSON.parse(row.completed_by) : null,
      completed_by: row.completed_by ? JSON.parse(row.completed_by) : null,
      completedAt: row.completed_at,
      completed_at: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

export default Booking;
