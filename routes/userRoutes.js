import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect, authorize } from '../middleware/auth.js';
import {
  getProfile,
  updateProfile,
  updateLocation,
  getProviders,
  getProviderDetails,
  addSavedProvider,
  removeSavedProvider,
  updateProviderAvailability,
  previewOCR,
  uploadProviderDocuments,
  changePassword
} from '../controllers/userController.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, process.env.UPLOAD_PATH || 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed (jpeg, jpg, png)'));
    }
  }
});

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.patch('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.put('/location', protect, authorize('provider'), updateLocation);
router.get('/providers', getProviders);
router.get('/providers/:id', getProviderDetails);
router.post('/saved-providers/:providerId', protect, authorize('client'), addSavedProvider);
router.delete('/saved-providers/:providerId', protect, authorize('client'), removeSavedProvider);
router.put('/availability', protect, authorize('provider'), updateProviderAvailability);

// OCR preview route for CNIC extraction
router.post('/provider-documents/ocr-preview', protect, upload.fields([
  { name: 'cnicFront', maxCount: 1 },
  { name: 'cnicBack', maxCount: 1 }
]), previewOCR);

// Provider document upload route
router.post('/provider-documents', protect, upload.fields([
  { name: 'cnicFront', maxCount: 1 },
  { name: 'cnicBack', maxCount: 1 }
]), uploadProviderDocuments);

export default router;
