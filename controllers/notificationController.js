import Notification from '../models/Notification.js';

export const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const result = await Notification.findByUserId(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    const notifications = result.notifications || result;
    const unreadCount = await Notification.getUnreadCount(req.user.id);

    res.status(200).json({
      status: 'success',
      data: notifications,
      unreadCount
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification || notification.user_id !== req.user.id) {
      return res.status(404).json({ status: 'error', message: 'Notification not found' });
    }

    await Notification.markAsRead(req.params.id);
    const updatedNotification = await Notification.findById(req.params.id);

    res.status(200).json({ status: 'success', data: updatedNotification });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.markAllAsReadForUser(req.user.id);

    res.status(200).json({ status: 'success', message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification || notification.user_id !== req.user.id) {
      return res.status(404).json({ status: 'error', message: 'Notification not found' });
    }

    await Notification.deleteById(req.params.id);

    res.status(200).json({ status: 'success', message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};
