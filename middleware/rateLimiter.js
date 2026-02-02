import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Trust proxy - required for Render and other reverse proxies
  trustProxy: true,
  // Skip failed requests (don't count them against limit)
  skipFailedRequests: true,
  // Skip successful requests (only count errors)
  skipSuccessfulRequests: false,
});

// Stricter limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 100 : 20, // 100 for dev, 20 for production (increased from 5)
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again later.'
  },
  // Trust proxy - required for Render and other reverse proxies
  trustProxy: true,
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
});

export default limiter;
