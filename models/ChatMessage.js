import pool from '../config/database.js';

class ChatMessage {
  static async create(data) {
    const connection = await pool.getConnection();
    try {
      // Use NULL for admin messages instead of 0 to avoid FK constraint
      const actualSenderId = data.sender_type === 'admin' ? null : data.sender_id;
      
      const [result] = await connection.query(
        `INSERT INTO chat_messages (booking_id, sender_id, sender_type, message, message_type, file_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          data.booking_id,
          actualSenderId,
          data.sender_type,
          data.message,
          data.message_type || 'text',
          data.file_url || null
        ]
      );

      const [message] = await connection.query(
        `SELECT cm.*, 
         CASE 
           WHEN cm.sender_type = 'admin' THEN 'Admin Support'
           ELSE u.name 
         END as sender_name
         FROM chat_messages cm
         LEFT JOIN users u ON cm.sender_id = u.id
         WHERE cm.id = ?`,
        [result.insertId]
      );

      return message[0];
    } finally {
      connection.release();
    }
  }

  static async findByBookingId(bookingId, limit = 100) {
    const connection = await pool.getConnection();
    try {
      const [messages] = await connection.query(
        `SELECT cm.*, 
         CASE 
           WHEN cm.sender_type = 'admin' THEN 'Admin Support'
           ELSE u.name 
         END as sender_name
         FROM chat_messages cm
         LEFT JOIN users u ON cm.sender_id = u.id
         WHERE cm.booking_id = ?
         ORDER BY cm.created_at DESC
         LIMIT ?`,
        [bookingId, limit]
      );

      return messages.reverse(); // Return in chronological order
    } finally {
      connection.release();
    }
  }

  static async markAsRead(bookingId, userId) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        `UPDATE chat_messages 
         SET is_read = TRUE, read_at = NOW()
         WHERE booking_id = ? AND sender_id != ? AND is_read = FALSE`,
        [bookingId, userId]
      );
    } finally {
      connection.release();
    }
  }

  static async getUnreadCount(bookingId, userId) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query(
        `SELECT COUNT(*) as count
         FROM chat_messages
         WHERE booking_id = ? AND sender_id != ? AND is_read = FALSE`,
        [bookingId, userId]
      );

      return result[0].count;
    } finally {
      connection.release();
    }
  }

  static async deleteById(id) {
    const connection = await pool.getConnection();
    try {
      await connection.query('DELETE FROM chat_messages WHERE id = ?', [id]);
    } finally {
      connection.release();
    }
  }

  static async deleteByBookingId(bookingId) {
    const connection = await pool.getConnection();
    try {
      await connection.query('DELETE FROM chat_messages WHERE booking_id = ?', [bookingId]);
      return true;
    } finally {
      connection.release();
    }
  }
}

export default ChatMessage;
