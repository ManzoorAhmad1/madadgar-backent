import User from '../models/User.js';
import pool from '../config/database.js';
import { sendTokenResponse, generateToken, generateRefreshToken } from '../utils/jwt.js';
import { sendEmail, welcomeEmail, otpEmail } from '../utils/email.js';
import { sendOTPSMS } from '../utils/sms.js';
import { formatPakistaniPhone, isValidPakistaniPhone } from '../utils/phoneFormatter.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    console.log('=== REGISTRATION REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { role, email, phone, password, name, preferredPayment } = req.body;

    // Validate required fields
    if (!email || !phone || !password || !name || !role) {
      console.log('❌ Missing required fields:', { email: !!email, phone: !!phone, password: !!password, name: !!name, role: !!role });
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields: name, email, phone, password, and role'
      });
    }

    // Validate and format phone number
    console.log('Validating phone number:', phone);
    if (!isValidPakistaniPhone(phone)) {
      console.log('❌ Invalid phone number format');
      return res.status(400).json({
        status: 'error',
        message: 'Invalid Pakistani phone number. Please use format: 03XX-XXXXXXX or +923XXXXXXXXX'
      });
    }

    const formattedPhone = formatPakistaniPhone(phone);
    console.log('Formatted phone:', formattedPhone);

    // Check if user already exists - separate checks for better error messages
    console.log('Checking if email exists:', email);
    const existingUserByEmail = await User.findByEmail(email);
    if (existingUserByEmail) {
      console.log('❌ Email already exists');
      return res.status(400).json({
        status: 'error',
        message: 'An account with this email already exists. Please login instead.'
      });
    }

    console.log('Checking if phone exists:', formattedPhone);
    const existingUserByPhone = await User.findByPhone(formattedPhone);
    if (existingUserByPhone) {
      console.log('❌ Phone already exists');
      return res.status(400).json({
        status: 'error',
        message: 'An account with this phone number already exists. Please login instead.'
      });
    }

    // Create user object
    const userData = {
      role,
      email,
      phone: formattedPhone,
      password,
      name
    };

    // Add role-specific data
    if (role === 'client') {
      userData.clientDetails = {
        preferredPayment: preferredPayment || 'cash',
        addresses: [],
        savedProviders: []
      };
    } else if (role === 'provider') {
      userData.providerDetails = {
        serviceCategories: [],
        isAvailable: false,
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        rating: { average: 0, count: 0 },
        documents: [],
        approved: false
      };
    }

    // Create user
    console.log('Creating user with data:', { email, phone: formattedPhone, role, name });
    const user = await User.create(userData);
    console.log('✅ User created successfully. ID:', user.id);

    // Generate OTP
    const { otp, otpExpires } = User.generateOTP();
    await User.updateById(user.id, { phone_otp: otp, otp_expires: otpExpires });
    console.log('✅ OTP generated:', otp);

    // Send OTP via Email
    try {
      await sendEmail({
        to: email,
        subject: 'Verify Your Account - Madadgar',
        html: otpEmail(name, otp)
      });
      console.log(`✅ OTP email sent to ${email}: ${otp}`);
    } catch (error) {
      console.error('Email Error:', error);
    }

    // Send OTP via SMS (optional)
    try {
      // await sendOTPSMS(formattedPhone, otp);
      console.log(`✅ OTP sent to ${formattedPhone}: ${otp}`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔑 [DEV] Use OTP: 123456 for testing`);
      }
    } catch (error) {
      console.error('SMS Error:', error);
      console.warn(`⚠️  OTP generated but SMS failed. OTP: ${otp}`);
    }

    // Send welcome email (optional - after verification)
    // try {
    //   await sendEmail({
    //     to: email,
    //     subject: 'Welcome to Madadgar!',
    //     html: welcomeEmail(name)
    //   });
    // } catch (error) {
    //   console.error('Email Error:', error);
    // }

    res.status(201).json({
      status: 'success',
      message: 'Registration successful. Please verify your phone number.',
      data: {
        userId: user.id,
        phone: formattedPhone,
        otpSent: true
      }
    });
    console.log('✅ Registration response sent successfully');
    console.log('=== REGISTRATION COMPLETE ===\n');
  } catch (error) {
    console.error('❌ Registration error:', error);
    console.error('Error stack:', error.stack);
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { identifier, password, loginMethod } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide identifier and password'
      });
    }

    // Format phone number if identifier looks like a phone number
    const formattedIdentifier = identifier.match(/^[0-9+\-\s\(\)]+$/) 
      ? formatPakistaniPhone(identifier) 
      : identifier;

    // Find user by email or phone
    let user = await User.findByEmailOrPhone(identifier, formattedIdentifier, true);

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await User.comparePassword(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check if user is verified
    if (!user.isVerified && !user.is_verified) {
      return res.status(403).json({
        status: 'error',
        message: 'Please verify your account first',
        data: { userId: user.id, verified: false }
      });
    }

    // Check if user is banned
    if (user.isBanned) {
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been suspended'
      });
    }

    // Update last active
    await User.updateById(user.id, { last_active: new Date() });

    // Send token response
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;
    console.log(req.body,'req.body')
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if OTP is expired
    if (user.otpExpires < Date.now()) {
      return res.status(400).json({
        status: 'error',
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Debug logging
    console.log('=== OTP Verification Debug ===');
    console.log('User ID:', userId);
    console.log('User from DB:', { 
      phone_otp: user.phone_otp, 
      phoneOTP: user.phoneOTP,
      otp_expires: user.otp_expires,
      otpExpires: user.otpExpires 
    });
    console.log('Input OTP:', otp, 'Type:', typeof otp);
    console.log('==============================');

    // Verify OTP (convert both to string for comparison)
    const userOtp = (user.phoneOTP || user.phone_otp || '').toString();
    const inputOtp = (otp || '').toString();
    
    console.log('Comparing:', { userOtp, inputOtp, match: userOtp === inputOtp });
    
    if (userOtp !== inputOtp) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid OTP'
      });
    }

    // Mark user as verified
    await User.updateById(user.id, { 
      is_verified: true, 
      phone_otp: null, 
      otp_expires: null 
    });

    // Send token response
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
export const resendOTP = async (req, res, next) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        status: 'error',
        message: 'User is already verified'
      });
    }

    // Generate new OTP
    const { otp, otpExpires } = User.generateOTP();
    await User.updateById(user.id, { phone_otp: otp, otp_expires: otpExpires });

    // Send OTP via SMS
    try {
      // await sendOTPSMS(user.phone, otp);
      console.log(`✅ OTP resent to ${user.phone}: ${otp}`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔑 [DEV] Use OTP: 1234 for testing`);
      }
    } catch (error) {
      console.error('SMS Error:', error);
      // Don't fail the request if SMS fails - useful in development
      console.warn(`⚠️  OTP generated but SMS failed. OTP: ${otp}`);
    }

    res.status(200).json({
      status: 'success',
      message: 'OTP sent successfully',
      ...(process.env.NODE_ENV === 'development' && { otp }) // Include OTP in dev mode for testing
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email or phone number'
      });
    }

    // Find user by email or phone
    let user;
    if (email) {
      user = await User.findByEmail(email);
    } else if (phone) {
      const formattedPhone = formatPakistaniPhone(phone);
      user = await User.findByPhone(formattedPhone);
    }

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'No user found with this email or phone'
      });
    }

    // Block sub-admins from resetting password
    if (user.role === 'admin' && user.email !== 'admin@madadgar.com') {
      return res.status(403).json({
        status: 'error',
        message: 'Sub-admins cannot reset password. Please contact the main administrator.'
      });
    }

    // Generate reset token
    const crypto = await import('crypto');
    const resetToken = crypto.default.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    await User.updateById(user.id, { 
      reset_password_token: resetToken, 
      reset_password_expire: resetTokenExpires 
    });

    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Send reset link via email
    try {
      if (email) {
        const { resetPasswordEmail } = await import('../utils/email.js');
        await sendEmail({
          to: user.email,
          subject: 'Password Reset Request - Madadgar',
          html: resetPasswordEmail(user.name, resetLink)
        });
        console.log(`✅ Password reset link sent to email: ${user.email}`);
      } else {
        // For phone, send SMS with short link
        const shortLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        await sendOTPSMS(user.phone, `Your password reset link: ${shortLink}`);
        console.log(`✅ Password reset link sent to phone: ${user.phone}`);
      }

      // In development, log reset link
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔑 [DEV] Password reset link: ${resetLink}`);
      }

      res.status(200).json({
        status: 'success',
        message: email ? 'Password reset link sent to your email' : 'Password reset link sent to your phone',
        data: {
          method: email ? 'email' : 'phone'
        }
      });
    } catch (error) {
      console.error('Failed to send OTP:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to send reset code. Please try again.'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify reset OTP
// @route   POST /api/auth/verify-reset-otp
// @access  Public
export const verifyResetOTP = async (req, res, next) => {
  try {
    const { email, phone, otp } = req.body;

    if (!otp || (!email && !phone)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide OTP and email or phone'
      });
    }

    // Find user
    let user;
    if (email) {
      user = await User.findByEmail(email);
    } else if (phone) {
      const formattedPhone = formatPakistaniPhone(phone);
      user = await User.findByPhone(formattedPhone);
    }

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if OTP is expired
    if (user.otp_expires < Date.now()) {
      return res.status(400).json({
        status: 'error',
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Verify OTP (use 123456 for testing in development)
    const isValidOTP = process.env.NODE_ENV === 'development' 
      ? (otp === user.phone_otp || otp === '123456')
      : otp === user.phone_otp;

    if (!isValidOTP) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid OTP'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'OTP verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide token and new password'
      });
    }

    // Find user by reset token
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE reset_password_token = ? AND reset_password_expire > NOW()',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token'
      });
    }

    const user = users[0];

    // Update password and clear token
    await User.updateById(user.id, { 
      password: newPassword,
      reset_password_token: null, 
      reset_password_expire: null 
    });

    // Send confirmation email
    try {
      const { passwordChangedEmail } = await import('../utils/email.js');
      await sendEmail({
        to: user.email,
        subject: 'Password Changed Successfully - Madadgar',
        html: passwordChangedEmail(user.name)
      });
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
    }

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
// @access  Public
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token required'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired refresh token'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    // Clear FCM token
    await User.updateById(req.user.id, { fcm_token: null });

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (req, res, next) => {
  try {
    const { googleId, email, name, avatar, role, idToken } = req.body;

    // Log incoming request for debugging
    console.log('[GoogleAuth] Request received:', { email, name, role, hasIdToken: !!idToken });

    if (!email || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and name are required for Google authentication'
      });
    }

    // Check if user exists by email
    let user = await User.findByEmail(email);
    let isNewUser = false;
    let hasDocuments = false;
    let documentStatus = null;

    if (user) {
      // User exists, login
      console.log('[GoogleAuth] Existing user found:', user.id);
      if (!user.googleId && !user.google_id && googleId) {
        await User.updateById(user.id, { google_id: googleId });
        user = await User.findById(user.id);
      }
      
      // Check if provider has documents
      if (user.role === 'provider' && user.provider_details) {
        const providerDetails = typeof user.provider_details === 'string' 
          ? JSON.parse(user.provider_details) 
          : user.provider_details;
        hasDocuments = providerDetails.documents && providerDetails.documents.length > 0;
        documentStatus = providerDetails.documentStatus || null;
      }
    } else {
      // Create new user
      console.log('[GoogleAuth] Creating new user');
      isNewUser = true;
      const userRole = role || 'client';
      user = await User.create({
        google_id: googleId,
        email,
        name,
        avatar,
        role: userRole,
        phone: `GOOGLE_${Date.now()}`, // Temporary phone
        is_verified: true,
        client_details: userRole === 'client' ? JSON.stringify({
          preferredPayment: 'online',
          addresses: [],
          savedProviders: []
        }) : null,
        provider_details: userRole === 'provider' ? JSON.stringify({
          serviceCategories: [],
          isAvailable: false,
          approved: false,
          documentStatus: null,
          documents: []
        }) : null
      });
      console.log('[GoogleAuth] New user created:', user.id);
    }

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Prepare user response
    const userResponse = {
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      isVerified: user.is_verified || user.isVerified || true,
      documentsApproved: user.documents_approved || user.documentsApproved || false
    };

    // Return response with both token fields for compatibility
    console.log('[GoogleAuth] Authentication successful');
    res.status(200).json({
      status: 'success',
      token: token,           // For web compatibility
      accessToken: token,     // For mobile compatibility
      refreshToken,
      user: userResponse,
      isNewUser,
      hasDocuments,
      documentStatus
    });
  } catch (error) {
    console.error('[GoogleAuth] Error:', error);
    next(error);
  }
};
