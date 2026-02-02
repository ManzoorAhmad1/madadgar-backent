import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { getFileUrl } from '../utils/fileUpload.js';
import { extractCNIC, formatCNIC } from '../utils/ocr.js';

// Helper function to validate CNIC image
const validateCNICImage = async (file) => {
  const errors = [];

  // Check file size (should be at least 50KB for a clear photo, max 5MB)
  if (file.size < 50 * 1024) {
    errors.push('Image file is too small. Please upload a clear photo of your CNIC.');
  }

  if (file.size > 5 * 1024 * 1024) {
    errors.push('Image file is too large. Maximum size is 5MB.');
  }

  // Check file format
  const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!allowedFormats.includes(file.mimetype)) {
    errors.push('Invalid image format. Only JPEG and PNG are allowed.');
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
    errors.push('Invalid file extension.');
  }

  // Basic filename validation (no suspicious patterns)
  const filename = file.originalname.toLowerCase();
  const suspiciousPatterns = ['sample', 'fake', 'test', 'dummy', 'example'];
  if (suspiciousPatterns.some(pattern => filename.includes(pattern))) {
    errors.push('Please upload a real CNIC image, not a sample or test image.');
  }

  return errors;
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      status: 'success',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const updates = req.body;
    const allowedUpdates = ['name', 'avatar', 'phone'];

    // Filter allowed updates
    const filteredUpdates = {};
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });

    // Get current user data to merge JSON fields
    const currentUser = await User.findById(req.user.id);

    // Role-specific updates - merge with existing data
    if (req.user.role === 'provider' && updates.providerDetails) {
      const currentDetails = currentUser.providerDetails || {};
      const updatedDetails = { ...currentDetails };
      
      Object.keys(updates.providerDetails).forEach(key => {
        if (key !== 'approved' && key !== 'rating') {
          updatedDetails[key] = updates.providerDetails[key];
        }
      });
      
      filteredUpdates.provider_details = updatedDetails;
    }

    if (req.user.role === 'client' && updates.clientDetails) {
      const currentDetails = currentUser.clientDetails || {};
      const updatedDetails = { ...currentDetails, ...updates.clientDetails };
      filteredUpdates.client_details = updatedDetails;
    }

    await User.updateById(req.user.id, filteredUpdates);
    const user = await User.findById(req.user.id);

    res.status(200).json({
      status: 'success',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const updateLocation = async (req, res, next) => {
  try {
    const { coordinates, address } = req.body;

    const locationData = {
      type: 'Point',
      coordinates,
      address
    };

    await User.updateById(req.user.id, {
      location: JSON.stringify(locationData)
    });

    const user = await User.findById(req.user.id);

    res.status(200).json({
      status: 'success',
      message: 'Location updated successfully',
      data: user.location
    });
  } catch (error) {
    next(error);
  }
};

export const getProviders = async (req, res, next) => {
  try {
    const {
      category,
      lat,
      lng,
      radius = 10,
      minRating,
      sortBy = 'distance',
      page = 1,
      limit = 20,
      approved,
      isAvailable
    } = req.query;

    const filters = {
      role: 'provider',
      isActive: true,
      category,
      minRating,
      lat,
      lng,
      radius,
      sortBy,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    // Dynamic filters based on query params
    if (approved !== undefined) {
      filters.approved = approved === 'true' || approved === true;
    }
    
    if (isAvailable !== undefined) {
      filters.isAvailable = isAvailable === 'true' || isAvailable === true;
    }

    const result = await User.findAll(filters);
    const providers = result.users;
    const total = result.total;

    res.status(200).json({
      status: 'success',
      data: providers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getProviderDetails = async (req, res, next) => {
  try {
    const provider = await User.findById(req.params.id);

    if (!provider || provider.role !== 'provider') {
      return res.status(404).json({
        status: 'error',
        message: 'Provider not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: provider
    });
  } catch (error) {
    next(error);
  }
};

export const addSavedProvider = async (req, res, next) => {
  try {
    const { providerId } = req.params;

    const user = await User.findById(req.user.id);
    const savedProviders = user.saved_providers ? JSON.parse(user.saved_providers) : [];
    
    if (!savedProviders.includes(providerId)) {
      savedProviders.push(providerId);
      await User.updateById(req.user.id, { saved_providers: JSON.stringify(savedProviders) });
    }

    res.status(200).json({
      status: 'success',
      message: 'Provider saved successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const removeSavedProvider = async (req, res, next) => {
  try {
    const { providerId } = req.params;

    const user = await User.findById(req.user.id);
    let savedProviders = user.saved_providers ? JSON.parse(user.saved_providers) : [];
    
    savedProviders = savedProviders.filter(id => id !== providerId);
    await User.updateById(req.user.id, { saved_providers: JSON.stringify(savedProviders) });

    res.status(200).json({
      status: 'success',
      message: 'Provider removed from saved list'
    });
  } catch (error) {
    next(error);
  }
};

export const updateProviderAvailability = async (req, res, next) => {
  try {
    const { isAvailable, location } = req.body;

    // Get current user
    const user = await User.findById(req.user.id);
    
    if (!user || user.role !== 'provider') {
      return res.status(403).json({
        status: 'error',
        message: 'Only providers can update availability'
      });
    }

    // Parse provider_details
    const providerDetails = typeof user.provider_details === 'string'
      ? JSON.parse(user.provider_details)
      : (user.provider_details || {});

    // Update availability
    providerDetails.isAvailable = isAvailable;

    // Update location if provided and provider is going online
    if (isAvailable && location && location.lat && location.lng) {
      providerDetails.location = {
        type: 'Point',
        coordinates: [location.lng, location.lat], // [longitude, latitude] format for GeoJSON
        lat: location.lat,
        lng: location.lng,
        address: location.address || null
      };
      console.log(`📍 Updated provider ${req.user.id} location:`, providerDetails.location);
    }

    // Update user record
    await User.updateById(req.user.id, { provider_details: providerDetails });

    res.status(200).json({
      status: 'success',
      message: `Availability set to ${isAvailable ? 'available' : 'unavailable'}`,
      data: { 
        isAvailable,
        location: providerDetails.location
      }
    });
  } catch (error) {
    next(error);
  }
};

export const uploadProviderDocuments = async (req, res, next) => {
  try {
    const userId = req.user.id; // Use authenticated user
    let cnicNumber = req.body.cnicNumber;
    const { bankDetails, otherContact } = req.body;
    const files = req.files;

    // Check if user is a provider
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        status: 'error',
        message: 'Only providers can upload documents'
      });
    }

    // Attempt OCR extraction from CNIC front image to auto-fill/verify CNIC
    let extractedCNIC = null;
    if (files && files.cnicFront && files.cnicFront[0]) {
      const frontPath = files.cnicFront[0].path;
      const backPath = files.cnicBack && files.cnicBack[0] ? files.cnicBack[0].path : null;
      extractedCNIC = await extractCNIC(frontPath, backPath);
    }

    // If user did not provide CNIC, try to use OCR result
    if (!cnicNumber) {
      if (extractedCNIC) {
        cnicNumber = formatCNIC(extractedCNIC);
      } else {
        return res.status(400).json({
          status: 'error',
          message: 'CNIC number is required for ID verification. OCR failed to extract CNIC from the image; please type it manually.'
        });
      }
    }

    // Validate CNIC number format (Pakistani CNIC: 13 digits, allows dashes)
    const cnicRegex = /^\d{5}-?\d{7}-?\d{1}$/;
    if (!cnicRegex.test(String(cnicNumber).replace(/\s/g, ''))) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid CNIC number format. Use format: XXXXX-XXXXXXX-X'
      });
    }

    // If OCR produced a CNIC and a user-provided CNIC exists, ensure they match
    if (extractedCNIC) {
      const normalizedProvided = String(cnicNumber).replace(/[^\d]/g, '');
      if (normalizedProvided !== extractedCNIC) {
        return res.status(400).json({
          status: 'error',
          message: 'Provided CNIC does not match the number detected on the CNIC image. Please re-check the image or enter the correct CNIC.',
          ocrDetected: formatCNIC(extractedCNIC)
        });
      }
    }

    // Validate that both CNIC images are uploaded
    if (!files || !files.cnicFront || !files.cnicBack) {
      return res.status(400).json({
        status: 'error',
        message: 'Both CNIC front and back images are required'
      });
    }

    // Validate CNIC front image
    const frontErrors = await validateCNICImage(files.cnicFront[0]);
    if (frontErrors.length > 0) {
      // Delete uploaded file
      if (fs.existsSync(files.cnicFront[0].path)) {
        fs.unlinkSync(files.cnicFront[0].path);
      }
      if (files.cnicBack && files.cnicBack[0] && fs.existsSync(files.cnicBack[0].path)) {
        fs.unlinkSync(files.cnicBack[0].path);
      }
      return res.status(400).json({
        status: 'error',
        message: 'CNIC Front Image Error',
        errors: frontErrors
      });
    }

    // Validate CNIC back image
    const backErrors = await validateCNICImage(files.cnicBack[0]);
    if (backErrors.length > 0) {
      // Delete uploaded files
      if (fs.existsSync(files.cnicFront[0].path)) {
        fs.unlinkSync(files.cnicFront[0].path);
      }
      if (fs.existsSync(files.cnicBack[0].path)) {
        fs.unlinkSync(files.cnicBack[0].path);
      }
      return res.status(400).json({
        status: 'error',
        message: 'CNIC Back Image Error',
        errors: backErrors
      });
    }

    // Check if both images are different
    if (files.cnicFront[0].size === files.cnicBack[0].size) {
      const frontBuffer = fs.readFileSync(files.cnicFront[0].path);
      const backBuffer = fs.readFileSync(files.cnicBack[0].path);
      
      if (Buffer.compare(frontBuffer, backBuffer) === 0) {
        // Delete uploaded files
        fs.unlinkSync(files.cnicFront[0].path);
        fs.unlinkSync(files.cnicBack[0].path);
        return res.status(400).json({
          status: 'error',
          message: 'CNIC front and back images cannot be the same. Please upload different sides.'
        });
      }
    }

    const user = await User.findById(userId);

    if (!user || user.role !== 'provider') {
      // Delete uploaded files
      if (fs.existsSync(files.cnicFront[0].path)) {
        fs.unlinkSync(files.cnicFront[0].path);
      }
      if (fs.existsSync(files.cnicBack[0].path)) {
        fs.unlinkSync(files.cnicBack[0].path);
      }
      return res.status(404).json({
        status: 'error',
        message: 'Provider not found'
      });
    }

    // Normalize provider details object from different possible DB shapes
    const currentDetailsFromUser = user.providerDetails || user.provider_details || {};
    const existingDocs = currentDetailsFromUser.documents ? currentDetailsFromUser.documents : [];
    if (existingDocs.length > 0) {
      // Delete new uploaded files
      if (fs.existsSync(files.cnicFront[0].path)) {
        fs.unlinkSync(files.cnicFront[0].path);
      }
      if (fs.existsSync(files.cnicBack[0].path)) {
        fs.unlinkSync(files.cnicBack[0].path);
      }
      return res.status(400).json({
        status: 'error',
        message: 'Documents already uploaded. Contact admin to update.'
      });
    }

    // Store file paths with full URL for Hostinger
    const documents = [];
    
    if (files && files.cnicFront) {
      documents.push({
        type: 'cnic',
        url: getFileUrl(files.cnicFront[0].filename),
        verified: false
      });
    }

    if (files && files.cnicBack) {
      documents.push({
        type: 'cnic',
        url: getFileUrl(files.cnicBack[0].filename),
        verified: false
      });
    }

    // Update provider details
    const currentDetails = currentDetailsFromUser || {};
    const updatedDetails = {
      ...currentDetails,
      documentStatus: 'pending', // Set default status as pending
      documentsUploadedAt: new Date()
    };

    if (cnicNumber) {
      updatedDetails.cnicNumber = cnicNumber;
    }

    if (documents.length > 0) {
      updatedDetails.documents = [...(currentDetails.documents || []), ...documents];
    }

    if (bankDetails) {
      try {
        updatedDetails.bankDetails = typeof bankDetails === 'string' ? JSON.parse(bankDetails) : bankDetails;
      } catch (err) {
        // If parsing fails, store raw value under notes
        updatedDetails.bankDetails = { raw: bankDetails };
      }
    }

    if (otherContact) {
      updatedDetails.otherContact = otherContact;
    }

    await User.updateById(userId, { provider_details: updatedDetails });
    const updatedUser = await User.findById(userId);

    res.status(200).json({
      status: 'success',
      message: 'Documents uploaded successfully. Your profile is under review and pending approval.',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

export const previewOCR = async (req, res, next) => {
  try {
    const files = req.files;
    if (!files || !files.cnicFront) {
      return res.status(400).json({ status: 'error', message: 'CNIC front image is required for OCR preview' });
    }

    const frontPath = files.cnicFront[0].path;
    const backPath = files.cnicBack && files.cnicBack[0] ? files.cnicBack[0].path : null;

    const extracted = await extractCNIC(frontPath, backPath);
    if (!extracted) {
      return res.status(200).json({ status: 'success', data: { cnic: null } });
    }

    return res.status(200).json({ status: 'success', data: { cnic: formatCNIC(extracted) } });
  } catch (err) {
    next(err);
  }
};

// Change password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 6 characters long',
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id, true);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Check current password
    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};
