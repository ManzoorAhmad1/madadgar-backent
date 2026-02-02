import pool from '../config/database.js';

class Notification {
  // Create notification
  static async create(notificationData) {
    const {
      user_id,
      title,
      message,
      type,
      related_id,
      related_model,
      data
    } = notificationData;

    const [result] = await pool.execute(
      `INSERT INTO notifications (
        user_id, title, message, type, related_id, related_model, data
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        title,
        message,
        type,
        related_id || null,
        related_model || null,
        data ? JSON.stringify(data) : null
      ]
    );

    return this.findById(result.insertId);
  }

  // Find by ID
  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM notifications WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) return null;
    return this.formatNotification(rows[0]);
  }

  // Find notifications by user
  static async findByUserId(userId, filters = {}) {
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [userId];

    if (filters.is_read !== undefined) {
      query += ' AND is_read = ?';
      params.push(filters.is_read);
    }

    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
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
    return rows.map(row => this.formatNotification(row));
  }

  // Mark as read
  static async markAsRead(id) {
    await pool.execute(
      'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    return this.findById(id);
  }

  // Mark all as read for a user
  static async markAllAsReadForUser(userId) {
    await pool.execute(
      'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = 0',
      [userId]
    );
  }

  // Delete notification
  static async deleteById(id) {
    const [result] = await pool.execute(
      'DELETE FROM notifications WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // Delete all notifications for a user
  static async deleteAllForUser(userId) {
    const [result] = await pool.execute(
      'DELETE FROM notifications WHERE user_id = ?',
      [userId]
    );
    return result.affectedRows;
  }

  // Get unread count for user
  static async getUnreadCount(userId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return rows[0].count || 0;
  }

  // Delete old notifications (older than X days)
  static async deleteOldNotifications(days = 30) {
    const [result] = await pool.execute(
      'DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );
    return result.affectedRows;
  }

  // Format notification object
  static formatNotification(row) {
    if (!row) return null;

    return {
      id: row.id,
      _id: row.id, // For backward compatibility
      userId: row.user_id,
      user_id: row.user_id,
      user: row.user_id,
      title: row.title,
      message: row.message,
      type: row.type,
      relatedId: row.related_id,
      related_id: row.related_id,
      relatedModel: row.related_model,
      related_model: row.related_model,
      refPath: row.related_model,
      isRead: row.is_read,
      is_read: row.is_read,
      readAt: row.read_at,
      read_at: row.read_at,
      data: row.data ? JSON.parse(row.data) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

export default Notification;
