-- Admin PIN System - Database Migration Script
-- Run this script to add PIN expiry support to existing databases

-- Step 1: Add pin_expires_at column to users table (if it doesn't exist)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS pin_expires_at DATETIME;

-- Step 2: Verify the column was added
-- SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME='users' AND TABLE_SCHEMA='rhulanituckshop';

-- Step 3: Create indexes for better query performance (optional)
-- ALTER TABLE users ADD INDEX IF NOT EXISTS idx_pin_expires (pin_expires_at);

-- Step 4: Set expiry for any existing PINs (optional)
-- UPDATE users 
-- SET pin_expires_at = DATE_ADD(NOW(), INTERVAL 24 HOUR) 
-- WHERE pin IS NOT NULL AND pin_expires_at IS NULL;

-- Step 5: Verify the migration
-- SELECT id, firstName, lastName, pin, pin_expires_at FROM users WHERE pin IS NOT NULL;

-- Step 6: Test PIN generation by calling API
-- POST /api/auth/generate-pin
-- Request body: { "userId": "your-user-id" }
