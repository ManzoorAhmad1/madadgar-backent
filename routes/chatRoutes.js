import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect, authorize } from '../middleware/auth.js';
import {
  sendMessage,
  getMessages,
  markAsRead,
  getUnreadCount
} from '../controllers/chatController.js';
import { getFileUrl } from '../utils/fileUpload.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, process.env.UPLOAD_PATH || 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    // Allow images and documents
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

// File upload endpoint
router.post('/upload', protect, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded'
    });
  }

  const fileUrl = getFileUrl(req.file.filename);

  res.status(200).json({
    status: 'success',
    fileUrl,
    filename: req.file.filename,
    originalName: req.file.originalname
  });
});

router.post('/messages', protect, sendMessage);
router.get('/:bookingId/messages', protect, getMessages);
router.post('/:bookingId/read', protect, markAsRead);
router.get('/:bookingId/unread-count', protect, getUnreadCount);

export default router;
