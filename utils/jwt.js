import jwt from 'jsonwebtoken';

// Generate JWT Token
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Generate Refresh Token
export const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  });
};

// Send token response
export const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user.id || user._id);
  const refreshToken = generateRefreshToken(user.id || user._id);

  // Remove password from output
  user.password = undefined;

  // Ensure consistent user object format
  const userResponse = {
    _id: user.id || user._id,
    id: user.id || user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
    isVerified: user.is_verified || user.isVerified || false,
    documentsApproved: user.documents_approved || user.documentsApproved || false,
    clientDetails: user.client_details || user.clientDetails,
    providerDetails: user.provider_details || user.providerDetails
  };

  res.status(statusCode).json({
    status: 'success',
    token: token,           // For web compatibility
    accessToken: token,     // For mobile compatibility
    refreshToken,
    user: userResponse
  });
};
