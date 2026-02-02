-- Run this query to delete the existing admin user
-- Then restart the server to create a new one with correct credentials from .env

DELETE FROM users WHERE role = 'admin';

-- After running this, restart your backend server
-- It will create admin with:
-- Email: admin@madadgar.com (from .env ADMIN_EMAIL)
-- Password: Admin@123 (from .env ADMIN_PASSWORD)
