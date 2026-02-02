# Database Migrations

## Migration Files

Run these SQL files in order on your Hostinger MySQL database:

### Order of Execution:
1. `001_create_users_table.sql` - Users table (base table)
2. `002_create_service_categories_table.sql` - Service categories
3. `003_create_bookings_table.sql` - Bookings (depends on users & categories)
4. `004_create_reviews_table.sql` - Reviews (depends on bookings)
5. `005_create_notifications_table.sql` - Notifications (depends on users)

## How to Run Migrations

### Option 1: Using phpMyAdmin (Recommended for Hostinger)

1. Login to Hostinger Control Panel
2. Go to **Databases** → **phpMyAdmin**
3. Select your database: `u313862463_madadgar`
4. Click on **SQL** tab
5. Copy and paste each file content in order
6. Click **Go** to execute

### Option 2: Using MySQL Command Line

```bash
mysql -h your-host -u u313862463_madadgar -p u313862463_madadgar < 001_create_users_table.sql
mysql -h your-host -u u313862463_madadgar -p u313862463_madadgar < 002_create_service_categories_table.sql
mysql -h your-host -u u313862463_madadgar -p u313862463_madadgar < 003_create_bookings_table.sql
mysql -h your-host -u u313862463_madadgar -p u313862463_madadgar < 004_create_reviews_table.sql
mysql -h your-host -u u313862463_madadgar -p u313862463_madadgar < 005_create_notifications_table.sql
```

### Option 3: Run All at Once

You can also combine all migrations into one file or run them sequentially via phpMyAdmin.

## Checking Migration Status

After running migrations, verify tables were created:

```sql
SHOW TABLES;
```

Expected output:
- users
- service_categories
- bookings
- reviews
- notifications

## Rolling Back

To drop all tables (⚠️ This will delete all data):

```sql
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS service_categories;
DROP TABLE IF EXISTS users;
```

## Notes

- All tables use `InnoDB` engine for transaction support
- All tables use `utf8mb4` charset for emoji support
- Foreign keys ensure referential integrity
- Indexes are created for better query performance
