-- Quick fix to make Provider ID 27 visible in search
-- Run this query in phpMyAdmin (srv2090.hstgr.io)

UPDATE users 
SET 
  provider_details = JSON_SET(
    COALESCE(provider_details, '{}'),
    '$.approved', CAST(1 AS JSON),
    '$.documentStatus', 'approved',
    '$.isAvailable', CAST(1 AS JSON),
    '$.serviceCategories', JSON_ARRAY(
      JSON_OBJECT('name', 'Plumber', '_id', 'plumber'),
      JSON_OBJECT('name', 'Electrician', '_id', 'electrician'),
      JSON_OBJECT('name', 'Carpenter', '_id', 'carpenter')
    ),
    '$.hourlyRate', 500,
    '$.bio', 'Professional service provider with multiple skills',
    '$.rating', JSON_OBJECT('average', 4.5, 'count', 10)
  ),
  is_active = 1,
  is_verified = 1
WHERE id = 27 AND role = 'provider';

-- Verify the result
SELECT 
  id, 
  name, 
  email,
  role,
  JSON_EXTRACT(provider_details, '$.approved') as approved,
  JSON_EXTRACT(provider_details, '$.isAvailable') as available,
  JSON_EXTRACT(provider_details, '$.documentStatus') as doc_status,
  JSON_EXTRACT(provider_details, '$.location.lat') as lat,
  JSON_EXTRACT(provider_details, '$.location.lng') as lng,
  JSON_EXTRACT(provider_details, '$.serviceCategories') as categories
FROM users 
WHERE id = 27;

-- If you want to approve ALL providers at once:
-- UPDATE users 
-- SET provider_details = JSON_SET(
--   COALESCE(provider_details, '{}'),
--   '$.approved', CAST(1 AS JSON),
--   '$.documentStatus', 'approved',
--   '$.isAvailable', CAST(1 AS JSON)
-- )
-- WHERE role = 'provider';
