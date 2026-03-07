# User Management Guide - Vehicle Prospect System

## Overview

This guide explains how to manage users directly through the database for the Vehicle Prospect System. Users can be created, modified, and assigned roles using SQL commands.

---

## Database Access

### Manus Deployment
1. Go to Management UI → Database panel
2. Use the connection info in bottom-left settings
3. Enable SSL if required
4. Connect with your database client

### Self-Hosted Deployment

#### Docker
```bash
docker-compose exec db mysql -u prospect_user -p vehicle_prospect
# Enter password when prompted
```

#### Direct MySQL
```bash
mysql -u prospect_user -p -h localhost vehicle_prospect
# Enter password when prompted
```

#### GUI Tools
- **MySQL Workbench**: Free, feature-rich
- **DBeaver**: Universal database tool
- **Adminer**: Web-based (lightweight)
- **TablePlus**: macOS/Windows (paid)

---

## User Table Schema

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | INT | Unique user identifier (auto-increment) |
| `openId` | VARCHAR(64) | Unique identifier (Manus OAuth or `local_email`) |
| `name` | TEXT | User's full name |
| `email` | VARCHAR(320) | User's email address |
| `loginMethod` | VARCHAR(64) | How user logs in: `manus`, `local` |
| `role` | ENUM | User role: `admin` (full access) or `user` (limited access) |
| `createdAt` | TIMESTAMP | Account creation date |
| `updatedAt` | TIMESTAMP | Last profile update |
| `lastSignedIn` | TIMESTAMP | Last login date |

---

## Creating Users

### Method 1: Local Authentication User (Self-Hosted)

When a user registers via the Login/Register page, the system automatically creates a user record. To manually create a local user:

```sql
INSERT INTO users (openId, email, name, loginMethod, role, lastSignedIn)
VALUES (
  'local_user@example.com',
  'user@example.com',
  'John Doe',
  'local',
  'user',
  NOW()
);
```

**Important**: After creating the user, you must store their password hash. See "Password Management" section below.

### Method 2: Manus OAuth User

For users authenticating via Manus OAuth:

```sql
INSERT INTO users (openId, email, name, loginMethod, role, lastSignedIn)
VALUES (
  'manus_oauth_id_12345',
  'user@example.com',
  'Jane Smith',
  'manus',
  'analyst',
  NOW()
);
```

### Method 3: Bulk User Creation

Create multiple users at once:

```sql
INSERT INTO users (openId, email, name, loginMethod, role, lastSignedIn)
VALUES 
  ('local_admin@example.com', 'admin@example.com', 'Admin User', 'local', 'admin', NOW()),
  ('local_analyst1@example.com', 'analyst1@example.com', 'Analyst One', 'local', 'user', NOW()),
  ('local_analyst2@example.com', 'analyst2@example.com', 'Analyst Two', 'local', 'user', NOW()),
  ('local_viewer@example.com', 'viewer@example.com', 'Viewer User', 'local', 'user', NOW());
```

---

## Assigning Roles

### Available Roles

| Role | Permissions | Use Case |
|------|-------------|----------|
| `admin` | Full system access, user management, all features | System administrator |
| `user` | Access to leads, filters, exports, data sources | Regular analyst/user |

### Update User Role

Change a user's role to admin:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'user@example.com';
```

Or by ID:

```sql
UPDATE users
SET role = 'admin'
WHERE id = 5;
```

### Promote Multiple Users

```sql
UPDATE users
SET role = 'admin'
WHERE email IN ('admin@example.com', 'manager@example.com');
```

### Demote User Back to Regular Access

```sql
UPDATE users
SET role = 'user'
WHERE email = 'user@example.com';
```

---

## Password Management

### Store Password Hash (Local Auth)

For local authentication users, passwords are stored in a separate JSON file (`.password_hashes.json`). In production, consider creating a dedicated `password_hashes` table.

**Current Implementation** (MVP):
```bash
# File location: /app/.password_hashes.json (Docker) or project root (local)
# Format: { "email@example.com": "bcrypt_hash_here", ... }
```

**To manually set a password** (for testing):

1. Generate a bcrypt hash using Node.js:
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('password123', 10).then(h => console.log(h));"
```

2. Add to `.password_hashes.json`:
```json
{
  "admin@example.com": "$2b$10$...",
  "user@example.com": "$2b$10$..."
}
```

**For Production**: Create a dedicated table:
```sql
CREATE TABLE password_hashes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Querying Users

### View All Users

```sql
SELECT id, email, name, role, loginMethod, createdAt, lastSignedIn
FROM users
ORDER BY createdAt DESC;
```

### Find Specific User

```sql
SELECT * FROM users WHERE email = 'user@example.com';
```

### List All Admins

```sql
SELECT id, email, name, createdAt
FROM users
WHERE role = 'admin'
ORDER BY createdAt DESC;
```

### List All Regular Users

```sql
SELECT id, email, name, createdAt
FROM users
WHERE role = 'user'
ORDER BY createdAt DESC;
```

### Count Users by Role

```sql
SELECT role, COUNT(*) as count
FROM users
GROUP BY role;
```

### Find Users by Login Method

```sql
SELECT id, email, name, loginMethod
FROM users
WHERE loginMethod = 'local'
ORDER BY email;
```

### Find Inactive Users (Not logged in for 30 days)

```sql
SELECT id, email, name, lastSignedIn
FROM users
WHERE lastSignedIn < DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY lastSignedIn DESC;
```

---

## Modifying Users

### Update User Email

```sql
UPDATE users
SET email = 'newemail@example.com'
WHERE id = 5;
```

### Update User Name

```sql
UPDATE users
SET name = 'New Name'
WHERE email = 'user@example.com';
```

### Update Multiple Fields

```sql
UPDATE users
SET 
  email = 'newemail@example.com',
  name = 'Updated Name',
  role = 'admin'
WHERE id = 5;
```

### Update Last Signed In (Manual)

```sql
UPDATE users
SET lastSignedIn = NOW()
WHERE email = 'user@example.com';
```

---

## Deleting Users

### Delete Single User

```sql
DELETE FROM users
WHERE email = 'user@example.com';
```

**Note**: This will cascade delete related records (leads, notifications, etc.) if foreign keys are set.

### Delete Multiple Users

```sql
DELETE FROM users
WHERE email IN ('user1@example.com', 'user2@example.com');
```

### Delete All Non-Admin Users

```sql
DELETE FROM users
WHERE role = 'user';
```

---

## Common Scenarios

### Scenario 1: Create Admin User for Initial Setup

```sql
-- Create admin user
INSERT INTO users (openId, email, name, loginMethod, role, lastSignedIn)
VALUES ('local_admin@example.com', 'admin@example.com', 'System Admin', 'local', 'admin', NOW());

-- Verify creation
SELECT * FROM users WHERE email = 'admin@example.com';
```

### Scenario 2: Add New Team Members

```sql
-- Add analyst
INSERT INTO users (openId, email, name, loginMethod, role, lastSignedIn)
VALUES ('local_analyst@example.com', 'analyst@example.com', 'Team Analyst', 'local', 'user', NOW());

-- Add another analyst
INSERT INTO users (openId, email, name, loginMethod, role, lastSignedIn)
VALUES ('local_analyst2@example.com', 'analyst2@example.com', 'Second Analyst', 'local', 'user', NOW());
```

### Scenario 3: Promote User to Admin

```sql
-- User registers and gets 'user' role by default
-- Later, promote to admin
UPDATE users
SET role = 'admin'
WHERE email = 'analyst@example.com';
```

### Scenario 4: Reset User Access

```sql
-- Deactivate user (change role)
UPDATE users
SET role = 'user'
WHERE email = 'admin@example.com';

-- Or delete user entirely
DELETE FROM users
WHERE email = 'admin@example.com';
```

### Scenario 5: Audit User Activity

```sql
-- See when users last logged in
SELECT email, name, role, lastSignedIn
FROM users
ORDER BY lastSignedIn DESC;

-- See recently created accounts
SELECT email, name, role, createdAt
FROM users
WHERE createdAt > DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY createdAt DESC;
```

---

## Best Practices

### Security

1. **Never share passwords**: Always use secure password generation
2. **Use strong passwords**: Minimum 12 characters with mixed case, numbers, symbols
3. **Rotate admin credentials**: Change admin passwords regularly
4. **Audit access**: Review user list and last login times periodically
5. **Delete unused accounts**: Remove inactive users after 90 days

### Maintenance

1. **Backup before bulk operations**: Always backup database before large updates
2. **Use transactions for critical changes**: Wrap important operations in transactions
3. **Log administrative actions**: Keep records of who created/modified users
4. **Test in staging first**: Test SQL commands in development before production

### Access Control

1. **Minimize admin accounts**: Keep only necessary admins
2. **Use principle of least privilege**: Assign lowest required role
3. **Separate duties**: Different admins for different functions
4. **Monitor role changes**: Track who has admin access

---

## Troubleshooting

### User Can't Login

1. Verify user exists:
```sql
SELECT * FROM users WHERE email = 'user@example.com';
```

2. Check password hash exists:
```bash
# For local auth, check .password_hashes.json file
cat .password_hashes.json | grep "user@example.com"
```

3. Verify email is correct (case-sensitive):
```sql
SELECT * FROM users WHERE LOWER(email) = LOWER('user@example.com');
```

### Forgot Admin Password

1. Generate new bcrypt hash (see Password Management section)
2. Update password hash in `.password_hashes.json`
3. Or create new admin user and delete old one

### Duplicate Email Error

```sql
-- Find duplicates
SELECT email, COUNT(*) as count
FROM users
GROUP BY email
HAVING count > 1;

-- Delete duplicate (keep the first one)
DELETE FROM users
WHERE email = 'duplicate@example.com'
AND id NOT IN (
  SELECT MIN(id) FROM users
  WHERE email = 'duplicate@example.com'
);
```

### Reset All Users to Regular Access

```sql
UPDATE users SET role = 'user';
```

---

## SQL Cheat Sheet

```sql
-- Create user
INSERT INTO users (openId, email, name, loginMethod, role, lastSignedIn)
VALUES ('local_email@example.com', 'email@example.com', 'Name', 'local', 'user', NOW());

-- List all users
SELECT * FROM users;

-- Promote to admin
UPDATE users SET role = 'admin' WHERE email = 'email@example.com';

-- Demote to user
UPDATE users SET role = 'user' WHERE email = 'email@example.com';

-- Delete user
DELETE FROM users WHERE email = 'email@example.com';

-- Count users
SELECT COUNT(*) FROM users;

-- Find by role
SELECT * FROM users WHERE role = 'admin';

-- Find inactive users
SELECT * FROM users WHERE lastSignedIn < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

---

## Support

For issues or questions:
1. Check database connection settings
2. Verify user table exists: `SHOW TABLES;`
3. Check user schema: `DESCRIBE users;`
4. Review application logs for authentication errors

---

**Last Updated**: March 2026
**Version**: 1.0.0
