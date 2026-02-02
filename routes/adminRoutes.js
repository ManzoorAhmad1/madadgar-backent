import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getDashboardStats,
  getAllUsers,
  getUserById,
  verifyProvider,
  updateUserStatus,
  updateUser,
  deleteUser,
  getAllProviders,
  deleteProvider,
  updateProviderStatus,
  updateProvider,
  verifyProviderStatus,
  getAllBookings,
  updateBookingStatus,
  deleteBooking,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllSubAdmins,
  createSubAdmin,
  updateSubAdmin,
  toggleSubAdminStatus,
  deleteSubAdmin,
  getPendingProviders,
  approveProviderDocuments,
  rejectProviderDocuments,
  getRunningRides,
  getRideDetails
} from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id', updateUser);
router.patch('/users/:id/toggle-status', updateUserStatus);
router.delete('/users/:id', deleteUser);

// Provider routes
router.get('/providers', getAllProviders);
router.patch('/providers/:id', updateProvider);
router.patch('/providers/:id/toggle-status', updateProviderStatus);
router.patch('/providers/:id/verify', verifyProviderStatus);
router.delete('/providers/:id', deleteProvider);

router.put('/users/:id/verify', verifyProvider);
router.get('/bookings', getAllBookings);
router.put('/bookings/:id/status', updateBookingStatus);
router.delete('/bookings/:id', deleteBooking);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Sub-Admin routes
router.get('/sub-admins', getAllSubAdmins);
router.post('/sub-admins', createSubAdmin);
router.put('/sub-admins/:id', updateSubAdmin);
router.patch('/sub-admins/:id/toggle-status', toggleSubAdminStatus);
router.delete('/sub-admins/:id', deleteSubAdmin);

// Document Approval routes
router.get('/pending-providers', getPendingProviders);
router.patch('/providers/:id/approve-documents', approveProviderDocuments);
router.patch('/providers/:id/reject-documents', rejectProviderDocuments);

// Running Rides Monitoring
router.get('/running-rides', getRunningRides);
router.get('/running-rides/:bookingId', getRideDetails);

export default router;
