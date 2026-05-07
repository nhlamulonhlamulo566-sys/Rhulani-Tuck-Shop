# Admin PIN Management System - Setup & Usage Guide

## Overview

The Admin PIN Management system is a professional, secure way to generate and manage daily 6-digit PINs for administrators. Each PIN automatically expires after 24 hours, requiring a new PIN to be generated the next day.

---

## Database Changes

### Updated Schema

The `users` table has been updated to support PIN expiry tracking:

```sql
ALTER TABLE users ADD COLUMN pin_expires_at DATETIME;
```

**User Table Structure:**
```sql
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  firstName VARCHAR(255) NOT NULL,
  lastName VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('Administration', 'Sales', 'Super Administration') NOT NULL,
  pin VARCHAR(6),
  pin_expires_at DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);
```

---

## API Endpoints

### 1. Generate/Update PIN
**Endpoint:** `POST /api/auth/generate-pin`

**Request:**
```json
{
  "userId": "user-id-here"
}
```

**Response (Success):**
```json
{
  "success": true,
  "pin": "123456",
  "expiresAt": "2025-04-25T10:30:00.000Z",
  "message": "New PIN generated successfully"
}
```

**Response (Error):**
```json
{
  "error": "User not found"
}
```

---

### 2. Fetch Current PIN Info
**Endpoint:** `GET /api/auth/generate-pin?userId=user-id-here`

**Response:**
```json
{
  "id": "user-id",
  "firstName": "John",
  "lastName": "Doe",
  "pin": "123456",
  "expiresAt": "2025-04-25T10:30:00.000Z",
  "status": "active",
  "hoursRemaining": 12
}
```

**PIN Status Values:**
- `active` - PIN is valid and can be used
- `expired` - PIN has expired and a new one needs to be generated
- `no_pin` - No PIN has been generated yet

---

## UI Components

### 1. Admin PIN Management Page

**Location:** `/admin-pin` in the dashboard sidebar

**Features:**
- ✅ View current PIN status
- ✅ Display remaining time until PIN expiry
- ✅ Copy PIN to clipboard functionality
- ✅ Generate new PIN with one click
- ✅ Visual progress indicator for PIN validity
- ✅ User information display
- ✅ PIN expiry countdown

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Admin PIN Management                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────┐  ┌──────────────────────────┐ │
│  │ Current PIN      │  │ Generate New PIN         │ │
│  ├──────────────────┤  ├──────────────────────────┤ │
│  │                  │  │                          │ │
│  │  PIN: 123456     │  │ Administrator            │ │
│  │  Status: Active  │  │ John Doe                 │ │
│  │  Time: 12 hours  │  │ john.doe@tuckshop.com    │ │
│  │                  │  │                          │ │
│  └──────────────────┘  │ [Generate New PIN]       │ │
│                        │                          │ │
│                        │ ✓ 6-digit PIN generated  │ │
│                        │ ✓ Expires after 24 hours │ │
│                        │ ✓ Required for admin ops │ │
│                        │                          │ │
│                        └──────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Sidebar Navigation

The Admin PIN Management page has been added to the dashboard sidebar:

```
Navigation Menu (Updated):
├── Dashboard
├── Sales
├── Till Management
├── Till Audits
├── Reports
├── Products
├── POS
├── Stock Count
├── Reorder Hub
├── Returns & Voids
├── Admin PIN ← NEW
└── Settings
```

**Icon:** Lock icon (🔒) for security indication

---

## Usage Workflow

### For Administrators

1. **First Time Setup:**
   - Navigate to "Admin PIN" in the sidebar
   - See "No Active PIN" message
   - Click "Generate New PIN"
   - New 6-digit PIN is created (valid for 24 hours)

2. **Daily PIN Generation:**
   - Each morning, go to "Admin PIN" page
   - View remaining time on current PIN
   - When expiring soon, click "Generate New PIN"
   - New PIN generated (old one automatically expires in 24 hours)

3. **Using the PIN:**
   - PIN is required for sensitive admin operations
   - Copy PIN to clipboard for quick access
   - PIN expires automatically after 24 hours
   - Generate new PIN for next day's operations

### PIN Expiry Flow

```
Day 1:
├─ 9:00 AM - Administrator generates PIN #123456
├─ PIN valid for 24 hours
└─ PIN marked for admin operations

Day 2:
├─ 9:00 AM - Previous PIN expires automatically
├─ Administrator generates new PIN #456789
└─ New PIN valid for next 24 hours
```

---

## Security Features

✅ **Random Generation:** 6-digit PINs generated cryptographically randomly  
✅ **Automatic Expiry:** PINs expire after exactly 24 hours  
✅ **Database Tracking:** PIN expiry timestamp stored in database  
✅ **Status Monitoring:** Real-time PIN status (active/expired/no_pin)  
✅ **User Specific:** Each admin has their own PIN  
✅ **Copy Protection:** PIN accessible via copy-to-clipboard  
✅ **Visual Indicator:** Progress bar shows time remaining  

---

## Integration with PIN Verification

The PIN Management system works with the existing PIN Verification endpoint (`/api/auth/verify-pin`) to:

1. Verify user authenticity via PIN
2. Ensure PIN is active (not expired)
3. Grant admin-only operations

### PIN Verification Check Flow
```
User attempts admin operation
    ↓
System checks if PIN is required
    ↓
Fetch current PIN from database
    ↓
Check if PIN is expired
    ├─ If expired → Reject operation, prompt for new PIN
    ├─ If active → Verify entered PIN matches
    └─ If matches → Allow admin operation
```

---

## Database Maintenance

### Viewing PIN Info

```sql
-- View active PINs
SELECT id, firstName, lastName, pin, pin_expires_at 
FROM users 
WHERE pin IS NOT NULL AND pin_expires_at > NOW();

-- View expired PINs
SELECT id, firstName, lastName, pin, pin_expires_at 
FROM users 
WHERE pin IS NOT NULL AND pin_expires_at < NOW();

-- View users without PIN
SELECT id, firstName, lastName 
FROM users 
WHERE pin IS NULL;
```

### Cleanup (Optional)

```sql
-- Clear expired PINs
UPDATE users 
SET pin = NULL, pin_expires_at = NULL 
WHERE pin_expires_at < NOW();
```

---

## Testing the System

### Test Case 1: Generate New PIN
```
1. Navigate to /admin-pin
2. Click "Generate New PIN"
3. Verify 6-digit PIN appears in Current PIN card
4. Verify "Active" badge shows
5. Verify time remaining shows ~24 hours
6. Verify expiry timestamp is approximately 24 hours from now
```

### Test Case 2: Copy PIN
```
1. View Current PIN card
2. Click "Copy PIN" button
3. Paste somewhere to verify PIN is copied
4. Button text changes to "Copied!" for 2 seconds
5. Toast notification appears
```

### Test Case 3: PIN Expiry
```
1. Generate PIN at time T
2. Wait for PIN to expire (or manually update DB: SET pin_expires_at = NOW())
3. Refresh page
4. Verify status shows "expired"
5. Verify "no_pin" status message appears
6. Verify "Generate New PIN" button shows error
7. Generate new PIN
8. Verify new PIN shows as "active"
```

---

## Troubleshooting

### PIN Not Showing
- Verify `pin_expires_at` column exists in users table
- Check sessionStorage has valid user data
- Verify API endpoint `/api/auth/generate-pin` is accessible

### PIN Not Expiring
- Verify database server time is correct
- Check `pin_expires_at` timestamp format (should be DATETIME)
- Verify MySQL query is using `NOW()` for timestamp comparison

### Generate Button Not Working
- Check browser console for errors
- Verify userId is passed correctly
- Ensure user exists in database
- Check database connection in .env.local

### PIN Doesn't Verify
- Verify PIN hasn't expired (check `pin_expires_at > NOW()`)
- Confirm entered PIN matches database value
- Check PIN verification endpoint working correctly

---

## File Locations

```
API Endpoint:
src/app/api/auth/generate-pin/route.ts

UI Component:
src/app/(dashboard)/admin-pin/page.tsx

Database Schema:
docs/db-schema.sql

Sidebar Navigation:
src/app/(dashboard)/layout.tsx
```

---

## Future Enhancements

- 📊 PIN generation audit log
- 📱 PIN generation notifications
- 🔔 PIN expiry reminders
- 📅 PIN history/previous PINs
- 🔐 PIN strength requirements
- 📧 Email notifications on PIN generation
- 📱 SMS notifications for PIN expiry
- 🎯 PIN generation rate limiting

---

## Support & Maintenance

**Last Updated:** April 24, 2026  
**Status:** ✅ Fully Implemented  
**Compatibility:** MySQL 8.x+, Next.js 15.5.9+, React 19.x+  

For issues or questions, refer to the troubleshooting section or contact your system administrator.
