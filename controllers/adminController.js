import User from '../models/User.js';
import Booking from '../models/Booking.js';
import ServiceCategory from '../models/ServiceCategory.js';
import pool from '../config/database.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const allUsers = await User.findAll({});
    const users = allUsers.users || allUsers;
    
    const totalUsers = users.length;
    const totalClients = users.filter(u => u.role === 'client').length;
    const totalProviders = users.filter(u => u.role === 'provider').length;
    const pendingProviders = users.filter(u => u.role === 'provider' && !u.approved).length;

    const allBookings = await Booking.findAll({});
    const bookings = allBookings.bookings || allBookings;
    
    const totalBookings = bookings.length;
    const activeBookings = bookings.filter(b => 
      ['pending', 'accepted', 'en_route', 'arrived', 'in_progress'].includes(b.status)
    ).length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;

    const paidBookings = bookings.filter(b => b.payment_status === 'paid');
    const totalRevenue = paidBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const platformCommission = paidBookings.reduce((sum, b) => sum + (b.commission || 0), 0);

    res.status(200).json({
      status: 'success',
      data: {
        users: { total: totalUsers, clients: totalClients, providers: totalProviders, pending: pendingProviders },
        bookings: { total: totalBookings, active: activeBookings, completed: completedBookings },
        revenue: { total: totalRevenue, commission: platformCommission }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('=== getAllUsers DEBUG ===');
    console.log('Search query param:', search);
    console.log('Search type:', typeof search);
    console.log('Search trimmed:', search ? search.trim() : 'null/undefined');
    console.log('Search length:', search ? search.trim().length : 0);
    
    let query = 'SELECT id, name, email, phone, role, is_active, is_verified, created_at FROM users WHERE 1=1';
    const params = [];
    
    // Search filter - only add if search has actual content
    if (search && search.trim().length > 0) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
      console.log('Search filter APPLIED with pattern:', searchPattern);
    } else {
      console.log('Search filter NOT APPLIED - no search value');
    }
    
    // Role filter
    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    
    // Status filter
    if (status === 'active') {
      query += ' AND is_active = 1';
    } else if (status === 'inactive') {
      query += ' AND is_active = 0';
    }
    
    // Get total count
    const countQuery = query.replace('SELECT id, name, email, phone, role, is_active, is_verified, created_at', 'SELECT COUNT(*) as total');
    const [countRows] = await pool.execute(countQuery, params);
    const total = countRows[0].total;
    
    // Add pagination
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    console.log('Final SQL Query:', query);
    console.log('Final SQL Params:', params);
    
    const [users] = await pool.execute(query, params);
    
    console.log('Results found:', users.length);
    console.log('========================\n');
    
    // Format response to only include necessary fields
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      is_active: user.is_active,
      is_verified: user.is_verified,
      created_at: user.created_at
    }));
    
    res.status(200).json({
      status: 'success',
      data: formattedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    res.status(200).json({ status: 'success', data: user });
  } catch (error) {
    next(error);
  }
};

export const verifyProvider = async (req, res, next) => {
  try {
    const { approved, rejectionReason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user || user.role !== 'provider') {
      return res.status(404).json({ status: 'error', message: 'Provider not found' });
    }

    const updates = {
      approved,
      approved_by: req.user.id,
      approved_at: new Date()
    };

    if (!approved && rejectionReason) {
      updates.rejection_reason = rejectionReason;
    }

    await User.updateById(req.params.id, updates);
    const updatedUser = await User.findById(req.params.id);

    res.status(200).json({ status: 'success', data: updatedUser });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const { is_active } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    await User.updateById(req.params.id, { is_active });
    const updatedUser = await User.findById(req.params.id);

    res.status(200).json({ status: 'success', data: updatedUser, message: 'User status updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { name, email, phone, is_active } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    await User.updateById(req.params.id, { name, email, phone, is_active });
    const updatedUser = await User.findById(req.params.id);

    res.status(200).json({ status: 'success', data: updatedUser, message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    // Prevent deleting main admin
    if (user.email === 'admin@madadgar.com') {
      return res.status(403).json({ status: 'error', message: 'Cannot delete main administrator' });
    }

    await User.deleteById(req.params.id);

    res.status(200).json({ status: 'success', message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Provider Management
export const getAllProviders = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('=== getAllProviders DEBUG ===');
    console.log('Search param:', search);
    
    let query = "SELECT id, name, email, phone, is_active, is_verified, provider_details, created_at FROM users WHERE role = 'provider'";
    const params = [];
    
    // Search filter - only add if search has actual content
    if (search && search.trim().length > 0) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
      console.log('Search filter APPLIED:', searchPattern);
    } else {
      console.log('No search filter');
    }
    
    // Get total count
    const countQuery = query.replace('SELECT id, name, email, phone, is_active, is_verified, provider_details, created_at', 'SELECT COUNT(*) as total');
    const [countRows] = await pool.execute(countQuery, params);
    const total = countRows[0].total;
    
    // Add pagination
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    console.log('SQL Query:', query);
    console.log('SQL Params:', params);
    
    const [providers] = await pool.execute(query, params);
    
    console.log('Results found:', providers.length);
    console.log('========================\n');
    
    // Format response to only include necessary fields
    const formattedProviders = providers.map(provider => ({
      id: provider.id,
      name: provider.name,
      email: provider.email,
      phone: provider.phone,
      is_active: provider.is_active,
      is_verified: provider.is_verified,
      provider_details: provider.provider_details,
      created_at: provider.created_at
    }));
    
    res.status(200).json({
      status: 'success',
      data: formattedProviders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateProviderStatus = async (req, res, next) => {
  try {
    const { is_active } = req.body;
    const user = await User.findById(req.params.id);

    if (!user || user.role !== 'provider') {
      return res.status(404).json({ status: 'error', message: 'Provider not found' });
    }

    await User.updateById(req.params.id, { is_active });
    const updatedUser = await User.findById(req.params.id);

    res.status(200).json({ status: 'success', data: updatedUser, message: 'Provider status updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateProvider = async (req, res, next) => {
  try {
    const { name, email, phone, is_active, documentStatus } = req.body;
    const user = await User.findById(req.params.id);

    if (!user || user.role !== 'provider') {
      return res.status(404).json({ status: 'error', message: 'Provider not found' });
    }

    const updates = { name, email, phone, is_active };
    
    // Update document status in provider_details if provided
    if (documentStatus) {
      let providerDetails = {};
      try {
        providerDetails = typeof user.provider_details === 'string' 
          ? JSON.parse(user.provider_details) 
          : (user.provider_details || {});
      } catch (e) {
        providerDetails = {};
      }
      
      providerDetails.documentStatus = documentStatus;
      updates.provider_details = providerDetails;
    }

    await User.updateById(req.params.id, updates);
    const updatedUser = await User.findById(req.params.id);

    res.status(200).json({ status: 'success', data: updatedUser, message: 'Provider updated successfully' });
  } catch (error) {
    next(error);
  }
};


export const verifyProviderStatus = async (req, res, next) => {
  try {
    const { approved } = req.body;
    const user = await User.findById(req.params.id);

    if (!user || user.role !== 'provider') {
      return res.status(404).json({ status: 'error', message: 'Provider not found' });
    }

    await User.updateById(req.params.id, { is_verified: approved });
    const updatedUser = await User.findById(req.params.id);

    res.status(200).json({ status: 'success', data: updatedUser, message: 'Provider verification updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteProvider = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user || user.role !== 'provider') {
      return res.status(404).json({ status: 'error', message: 'Provider not found' });
    }

    await User.deleteById(req.params.id);

    res.status(200).json({ status: 'success', message: 'Provider deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getAllBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const result = await Booking.findAll({
      status,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    const bookings = result.bookings || result;
    const total = result.total || bookings.length;

    res.status(200).json({
      status: 'success',
      data: bookings,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    next(error);
  }
};

export const updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    await Booking.updateById(req.params.id, { status });
    
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' });
    }

    res.status(200).json({ status: 'success', data: booking });
  } catch (error) {
    next(error);
  }
};

export const deleteBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Booking not found' 
      });
    }

    // Delete related data first
    // Delete reviews
    await pool.execute('DELETE FROM reviews WHERE booking_id = ?', [bookingId]);
    
    // Delete chat messages
    await pool.execute('DELETE FROM chat_messages WHERE booking_id = ?', [bookingId]);
    
    // Delete notifications
    await pool.execute('DELETE FROM notifications WHERE related_id = ? AND related_model = ?', 
      [bookingId, 'booking']);

    // Delete the booking
    await Booking.deleteById(bookingId);

    console.log(`✅ Admin deleted booking ${booking.booking_id || bookingId}`);

    res.status(200).json({ 
      status: 'success', 
      message: 'Booking and related data deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const category = await ServiceCategory.create(req.body);
    res.status(201).json({ status: 'success', data: category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    await ServiceCategory.updateById(req.params.id, req.body);
    
    const category = await ServiceCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ status: 'error', message: 'Category not found' });
    }

    res.status(200).json({ status: 'success', data: category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const category = await ServiceCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ status: 'error', message: 'Category not found' });
    }

    await ServiceCategory.deleteById(req.params.id);

    res.status(200).json({ status: 'success', message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};

// Sub-Admin Management
export const getAllSubAdmins = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('=== getAllSubAdmins DEBUG ===');
    console.log('Search param:', search);
    
    let query = "SELECT id, name, email, phone, is_active, permissions, created_at FROM users WHERE role = 'admin' AND email != 'admin@madadgar.com'";
    const params = [];
    
    // Search filter - only add if search has actual content
    if (search && search.trim().length > 0) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
      console.log('Search filter APPLIED:', searchPattern);
    } else {
      console.log('No search filter');
    }
    
    // Get total count
    const countQuery = query.replace('SELECT id, name, email, phone, is_active, permissions, created_at', 'SELECT COUNT(*) as total');
    const [countRows] = await pool.execute(countQuery, params);
    const total = countRows[0].total;
    
    // Add pagination
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    console.log('SQL Query:', query);
    console.log('SQL Params:', params);
    
    const [subAdmins] = await pool.execute(query, params);
    
    console.log('Results found:', subAdmins.length);
    console.log('========================\n');
    
    // Format response to only include necessary fields
    const formattedSubAdmins = subAdmins.map(admin => ({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      is_active: admin.is_active,
      permissions: admin.permissions,
      created_at: admin.created_at
    }));
    
    res.status(200).json({
      status: 'success',
      data: formattedSubAdmins,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createSubAdmin = async (req, res, next) => {
  try {
    const { name, email, phone, password, permissions } = req.body;

    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already registered'
      });
    }

    // Create sub-admin with permissions (auto-verified)
    const subAdmin = await User.create({
      name,
      email,
      phone,
      password,
      role: 'admin',
      is_active: true,
      is_verified: true,
      permissions: JSON.stringify(permissions || [])
    });

    res.status(201).json({
      status: 'success',
      data: subAdmin
    });
  } catch (error) {
    next(error);
  }
};

export const updateSubAdmin = async (req, res, next) => {
  try {
    const { name, email, phone, password, permissions } = req.body;
    const updates = { name, email, phone };

    // Only update password if provided
    if (password) {
      updates.password = password;
    }

    // Update permissions if provided
    if (permissions) {
      updates.permissions = JSON.stringify(permissions);
    }

    await User.updateById(req.params.id, updates);
    const subAdmin = await User.findById(req.params.id);

    if (!subAdmin) {
      return res.status(404).json({
        status: 'error',
        message: 'Sub-admin not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: subAdmin
    });
  } catch (error) {
    next(error);
  }
};

export const toggleSubAdminStatus = async (req, res, next) => {
  try {
    const { is_active } = req.body;
    
    await User.updateById(req.params.id, { is_active });
    const subAdmin = await User.findById(req.params.id);

    if (!subAdmin) {
      return res.status(404).json({
        status: 'error',
        message: 'Sub-admin not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: subAdmin
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSubAdmin = async (req, res, next) => {
  try {
    const subAdmin = await User.findById(req.params.id);

    if (!subAdmin) {
      return res.status(404).json({
        status: 'error',
        message: 'Sub-admin not found'
      });
    }

    // Prevent deleting main admin
    if (subAdmin.email === process.env.ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Cannot delete main admin'
      });
    }

    await User.deleteById(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Sub-admin deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get pending providers (documents awaiting approval)
export const getPendingProviders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const [rows] = await pool.execute(
      `SELECT * FROM users 
       WHERE role = 'provider' 
       AND JSON_UNQUOTE(JSON_EXTRACT(provider_details, '$.documentStatus')) = 'pending'
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]
    );

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM users 
       WHERE role = 'provider' 
       AND JSON_UNQUOTE(JSON_EXTRACT(provider_details, '$.documentStatus')) = 'pending'`
    );

    res.status(200).json({
      status: 'success',
      data: {
        providers: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(countResult[0].total / parseInt(limit)),
          totalItems: countResult[0].total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Approve provider documents
export const approveProviderDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const provider = await User.findById(id);

    if (!provider || provider.role !== 'provider') {
      return res.status(404).json({
        status: 'error',
        message: 'Provider not found'
      });
    }

    const currentDetails = provider.providerDetails || {};
    const updatedDetails = {
      ...currentDetails,
      documentStatus: 'approved',
      approvedAt: new Date(),
      approvedBy: req.user.id
    };

    await User.updateById(id, { provider_details: updatedDetails });
    const updatedProvider = await User.findById(id);

    res.status(200).json({
      status: 'success',
      message: 'Provider documents approved successfully',
      data: updatedProvider
    });
  } catch (error) {
    next(error);
  }
};

// Reject provider documents
export const rejectProviderDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const provider = await User.findById(id);

    if (!provider || provider.role !== 'provider') {
      return res.status(404).json({
        status: 'error',
        message: 'Provider not found'
      });
    }

    const currentDetails = provider.providerDetails || {};
    const updatedDetails = {
      ...currentDetails,
      documentStatus: 'rejected',
      rejectedAt: new Date(),
      rejectedBy: req.user.id,
      rejectionReason: reason || 'Documents do not meet requirements'
    };

    await User.updateById(id, { provider_details: updatedDetails });
    const updatedProvider = await User.findById(id);

    res.status(200).json({
      status: 'success',
      message: 'Provider documents rejected',
      data: updatedProvider
    });
  } catch (error) {
    next(error);
  }
};

// Get all running/active rides for admin monitoring
export const getRunningRides = async (req, res, next) => {
  try {
    const connection = await pool.getConnection();
    
    const [rides] = await connection.query(`
      SELECT 
        b.id,
        b.booking_id,
        b.status,
        b.location_address,
        b.location_coordinates,
        b.tracking,
        b.pricing,
        b.scheduled_time,
        b.created_at,
        b.updated_at,
        c.id as client_id,
        c.name as client_name,
        c.phone as client_phone,
        p.id as provider_id,
        p.name as provider_name,
        p.phone as provider_phone,
        sc.name as service_name,
        sc.icon as service_icon,
        (SELECT COUNT(*) FROM chat_messages WHERE booking_id = b.booking_id) as message_count,
        (SELECT MAX(created_at) FROM chat_messages WHERE booking_id = b.booking_id) as last_message_at
      FROM bookings b
      INNER JOIN users c ON b.client_id = c.id
      LEFT JOIN users p ON b.provider_id = p.id
      LEFT JOIN service_categories sc ON b.service_category_id = sc.id
      WHERE b.status IN ('pending', 'accepted', 'en_route', 'arrived', 'in_progress', 'completed')
        AND (b.payment IS NULL OR JSON_EXTRACT(b.payment, '$.status') != 'paid')
      ORDER BY 
        CASE b.status
          WHEN 'in_progress' THEN 1
          WHEN 'en_route' THEN 2
          WHEN 'arrived' THEN 3
          WHEN 'accepted' THEN 4
          WHEN 'pending' THEN 5
          WHEN 'completed' THEN 6
        END,
        b.created_at DESC
    `);

    connection.release();

    const formattedRides = rides.map(ride => {
      const pricing = ride.pricing ? JSON.parse(ride.pricing) : {};
      
      return {
        id: ride.id,
        bookingId: ride.booking_id,
        status: ride.status,
        client: {
          id: ride.client_id,
          name: ride.client_name,
          phone: ride.client_phone
        },
        provider: ride.provider_id ? {
          id: ride.provider_id,
          name: ride.provider_name,
          phone: ride.provider_phone
        } : null,
        service: {
          name: ride.service_name,
          icon: ride.service_icon
        },
        location: {
          address: ride.location_address,
          coordinates: ride.location_coordinates ? JSON.parse(ride.location_coordinates) : null
        },
        tracking: ride.tracking ? JSON.parse(ride.tracking) : null,
        pricing: {
          total: pricing.totalAmount || pricing.total || 0,
          finalAgreed: pricing.finalAgreed || pricing.totalAmount || pricing.total || 0
        },
        messageCount: ride.message_count || 0,
        lastMessageAt: ride.last_message_at,
        createdAt: ride.created_at,
        acceptedAt: ride.updated_at
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        rides: formattedRides,
        total: formattedRides.length,
        stats: {
          pending: formattedRides.filter(r => r.status === 'pending').length,
          accepted: formattedRides.filter(r => r.status === 'accepted').length,
          enRoute: formattedRides.filter(r => r.status === 'en_route').length,
          arrived: formattedRides.filter(r => r.status === 'arrived').length,
          inProgress: formattedRides.filter(r => r.status === 'in_progress').length,
          completed: formattedRides.filter(r => r.status === 'completed').length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get specific ride details for admin
export const getRideDetails = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};
