# Role-Based Access Control & Balance Tracking System

## Overview

This document outlines the comprehensive role-based access control (RBAC) and balance tracking system implemented in the Rhulani Tuck Shop POS application.

## Roles & Permissions

### 1. Super Administrator
**Access Level:** Full System Access
- Can access ALL features in the application
- Can create, edit, and delete Administrator accounts
- Can create, edit, and delete Sales personnel accounts
- Can view all reports and audit logs
- Can authorize sensitive operations (voids, returns, deletions)
- Can manage system settings and configurations

### 2. Administrator (Regular Admin)
**Access Level:** Limited Administrative Access
- Can access: Dashboard, Sales Reports, Till Management, Till Audits, Reports, Products, Stock Count, Reorder Hub, Settings, Admin PIN management
- **CANNOT:** Create other Administrator accounts (only Super Administrators can)
- **CANNOT:** Edit or delete other Administrator accounts
- Can only manage Sales personnel accounts
- Can authorize sensitive operations (voids, returns, deletions)
- Must have a unique 6-digit PIN for authorization

### 3. Sales Personnel
**Access Level:** Point of Sale Only
- Can ONLY access the Point of Sale (POS) screen
- Automatically redirected to POS on login
- Must enter opening balance when starting their shift
- Can perform:
  - Ring up sales
  - Process cash and card payments
  - Record withdrawals with reason
  - View transaction history
- **CANNOT:** Delete or void sales without Administrator PIN verification

## Opening & Closing Balance System

### Admin Authorization Required

**ALL sensitive till operations now require Administrator PIN authorization:**

1. **Opening Till** - Administrator PIN required before entering opening balance
2. **Closing Till** - Administrator PIN required before entering closing balance
3. **Cash & Card Withdrawals** - Administrator PIN required for each withdrawal
4. **Voiding Sales** - Administrator PIN required
5. **Processing Returns** - Administrator PIN required

### Sales Person Opening Till

**Flow:**
1. Sales person logs in
2. PIN auth dialog appears: "Administrator Authorization Required"
3. Sales person calls administrator
4. Administrator enters their 6-digit PIN
5. Opening balance dialog appears
6. Sales person enters opening balance
7. Admin authorization recorded with timestamp
8. Till session starts with status "Active"

**Opening Balance Dialog:**
- Title: "Start Till Session"
- Shows: "Authorized by: [Admin Name]"
- Input: Opening Balance (in Rand, R)
- Must be a valid number ≥ 0
- Creates a new TillSession record with `startedBy` field

### Balance Tracking During Shift

**Balance Components:**
- **Opening Balance:** Amount entered by sales person at shift start
- **Sales:** Total amount from completed sales
- **Withdrawals:** Cash removed from till (with reason recorded)
  - **Requires Admin PIN for each withdrawal**
  - Amount and reason logged with authorization
- **Voids:** Total amount of voided sales
  - **Requires Admin PIN**
- **Expected Balance:** Opening + Sales - Withdrawals - Voids
- **Closing Balance:** Amount entered by sales person at shift end

### Admin-Authorized Closing Till

**Flow:**
1. Sales person clicks "Close Till" button
2. PIN auth dialog appears: "Administrator Authorization Required to Close Till"
3. Administrator enters their 6-digit PIN
4. Closing balance dialog appears
5. Sales person enters actual closing balance
6. System calculates: Expected Balance = Opening + Sales - Withdrawals - Voids
7. Compares Expected Balance vs Actual Closing Balance
8. Till session closed with status "Closed"
9. Admin authorization recorded with timestamp

**Closing Balance Dialog:**
- Title: "Close Till Session"
- Shows: "Authorized by: [Admin Name]"
- Shows: "Opening Balance: R[amount]"
- Input: Closing Balance (in Rand, R)
- Must be a valid number ≥ 0
- Records `closedBy` field with admin name

### Balance Reconciliation

**For Sales Personnel:**
- When closing their shift, they must enter the actual closing balance
- System calculates expected balance based on transactions
- Any discrepancy is flagged for admin review

**For Administrators/Super Administrators:**
- Can view all sales person shifts and balances
- Can see opening balance, closing balance, and calculated expected balance
- Can see who authorized the opening and closing
- Can identify discrepancies
- Can view detailed transaction history for auditing

## Point of Sale Features

### Sale Creation
- Sales person scans or enters barcode of products
- Products are added to cart
- Multiple payment methods supported: Cash, Card
- Tax rate applied automatically
- Change calculated for cash payments
- Receipt generated and displayed

### Withdrawal Feature
**Access:** Sales Personnel (with Administrator PIN)

**Process:**
1. Sales person clicks "Withdrawal" button on POS screen
2. PIN auth dialog appears: "Administrator Authorization Required for Withdrawal"
3. Sales person calls administrator
4. Administrator enters their 6-digit PIN
5. Withdrawal dialog appears
6. Sales person enters amount to withdraw (R)
7. Sales person enters reason for withdrawal (recommended)
8. Confirm withdrawal
9. Withdrawal is recorded with:
   - Amount and reason
   - Authorization details (admin name, timestamp)
   - Transaction type: 'withdrawal'
10. Amount is deducted from expected balance calculation

**Example Reasons:**
- "Petty cash top-up"
- "Delivery to manager"
- "Safe deposit"
- "End of shift reconciliation"

### Void Sales Feature
**Access:** Requires Administrator PIN

**Process:**
1. Sales person attempts to void/delete a sale
2. PIN auth dialog appears: "Administrator PIN Required"
3. Sales person calls administrator
4. Administrator enters their 6-digit PIN
5. If PIN is valid:
   - Sale status changed to "Voided"
   - Authorization record added with admin details (name, timestamp)
   - Amount deducted from expected balance
6. Void is logged for audit purposes

**Example Scenarios:**
- Customer disputes charge
- Wrong product rung up
- Sale was accidental
- Cash drawer error correction

### Return Feature
**Access:** Requires Administrator PIN

**Process:**
1. Sales person initiates a return
2. PIN auth dialog appears: "Administrator PIN Required"
3. Sales person calls administrator
4. Administrator enters their 6-digit PIN
5. If PIN is valid:
   - Return is recorded with:
     - Sale ID reference
     - Items returned
     - Reason
     - Authorization details (admin name, timestamp)
   - Inventory adjusted
   - Amount added back to expected balance
6. Return is logged for audit purposes

**Example Scenarios:**
- Defective product
- Customer changed mind
- Wrong item sold
- Quality issue identified

## Admin User Management

### Creating New Users

**Super Administrators can create:**
- Sales Personnel
- Administrator accounts
- Other Super Administrator accounts

**Regular Administrators can create:**
- Sales Personnel ONLY
- Cannot create or modify any Administrator accounts

**Creation Process:**
1. Navigate to Settings
2. Fill in user details:
   - First Name
   - Last Name
   - Email (unique username)
   - Password (min 6 characters)
   - Role selection
3. If role is Administrator or Super Administrator:
   - 6-digit PIN is required
   - PIN must be unique
   - PIN is used for authorizations
4. Submit to create account

### PIN Requirements
- **Length:** Exactly 6 digits
- **Uniqueness:** Each admin must have a unique PIN
- **Usage:** Required to authorize:
  - Voiding sales
  - Processing returns
  - Deleting transactions
  - Editing admin accounts (for non-super-admins)

### Preventing Unauthorized Admin Creation

**Protection Mechanism:**
- Non-Super Administrators see only "Sales" role option in creation form
- If they try to create an Administrator account via API, they receive: "Only Super Administrators can create Administrator accounts"
- Editing restrictions prevent admins from modifying other admin accounts
- Only Super Administrators can create or edit Administrator accounts

## Database Schema

### till_management Table
```sql
CREATE TABLE till_management (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  openingBalance DECIMAL(10, 2) NOT NULL,
  closingBalance DECIMAL(10, 2),
  openedAt DATETIME NOT NULL,
  closedAt DATETIME,
  userName VARCHAR(255),
  status ENUM('Active', 'Closed'),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  INDEX idx_userId (userId),
  INDEX idx_openedAt (openedAt)
);
```

### sales Table (Updated)
```sql
CREATE TABLE sales (
  id VARCHAR(36) PRIMARY KEY,
  date DATETIME NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  customerName VARCHAR(255),
  userId VARCHAR(36) NOT NULL,
  paymentMethod ENUM('Card', 'Cash', 'Transfer'),
  subtotal DECIMAL(10, 2),
  tax DECIMAL(10, 2),
  amountPaid DECIMAL(10, 2),
  change DECIMAL(10, 2),
  salesperson VARCHAR(255) NOT NULL,
  status ENUM('Completed', 'Voided', 'Returned', 'Partially Returned') NOT NULL,
  transactionType ENUM('sale', 'withdrawal', 'voucher'),
  withdrawalReason TEXT,
  cardTransactionId VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  INDEX idx_date (date),
  INDEX idx_userId (userId),
  INDEX idx_status (status)
);
```

## API Endpoints

### Till Management
- `GET /api/till-management` - Get all till sessions
- `POST /api/till-management` - Create new till session
- `GET /api/till-management/[id]` - Get specific till session
- `PUT /api/till-management/[id]` - Update till session (closing)

### Sales
- `GET /api/sales` - Get all sales
- `POST /api/sales` - Create new sale or withdrawal
- `GET /api/sales/[id]` - Get specific sale
- `PUT /api/sales/[id]` - Update sale (void, return)

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user (with role restrictions)
- `PUT /api/users/[id]` - Update user (with role restrictions)
- `DELETE /api/users/[id]` - Delete user

### Auth
- `POST /api/auth/verify-pin` - Verify administrator PIN

## Security Considerations

1. **PIN Protection:** All administrative actions require PIN verification
2. **Role Isolation:** Sales personnel can only access POS
3. **Audit Trail:** All authorizations logged with:
   - Who authorized the action
   - When it was authorized
   - What action was taken
4. **Balance Verification:** Multiple checkpoints ensure data integrity
5. **Permission Validation:** Server-side validation on all user creation/modification endpoints

## User Workflows

### Sales Person Workflow
```
1. Login
   ↓
2. PIN Auth Required - Administrator enters PIN
   ↓
3. Enter Opening Balance (if new session)
   ↓
4. Start Selling
   - Ring up items
   - Process cash/card payments
   ↓
5. Perform Transactions
   - Regular sales
   - Withdrawals (requires admin PIN for each)
   - Request voids/returns (requires admin PIN)
   ↓
6. Close Shift
   - PIN Auth Required - Administrator enters PIN
   - Enter Closing Balance
   - System verifies balance
   - Shift closed
```

### Administrator Workflow
```
1. Login (Admin credentials)
   ↓
2. Access Admin Dashboard
   ↓
3. Can:
   - View all sales/transactions
   - View till sessions and balances
   - Authorize voids and returns
   - Manage Sales personnel (not other admins)
   - View reports
   - Audit till reconciliation
   ↓
4. Authorize Sensitive Operations
   - Enter PIN for confirmation
   - Action logged with admin details
```

### Super Administrator Workflow
```
1. Login (Super Admin credentials)
   ↓
2. Access Full System
   ↓
3. Can:
   - All Administrator functions
   - Create/edit/delete Administrator accounts
   - Create/edit/delete other Super Administrators
   - Manage all users
   - Configure system settings
   - View all audit logs
   - Override any restrictions
```

## Testing Guide

### Test Case 1: Opening Till Requires Admin PIN
1. Login as Sales person
2. PIN auth dialog appears
3. Try to skip PIN → cannot proceed
4. Wrong PIN entered → error message
5. Correct admin PIN entered → success
6. Opening balance dialog appears
7. Expected: Cannot start selling without admin authorization ✓

### Test Case 2: Closing Till Requires Admin PIN
1. Active till session running
2. Click "Close Till" button
3. PIN auth dialog appears
4. Correct admin PIN entered → success
5. Closing balance dialog appears
6. Enter closing balance
7. Till session closes with `closedBy` field populated
8. Expected: Cannot close till without admin authorization ✓

### Test Case 3: Withdrawal Requires Admin PIN
1. Active till session running
2. Click "Withdrawal" button
3. PIN auth dialog appears
4. Try to enter amount without PIN → cannot proceed
5. Correct admin PIN entered → success
6. Withdrawal dialog shows "Authorized by: [Admin Name]"
7. Enter amount and reason
8. Withdrawal recorded with authorization
9. Expected: Cannot withdraw without admin authorization ✓

### Test Case 4: Admin Authorization Tracking
1. Opening till with Admin A's PIN
2. Making withdrawal with Admin B's PIN
3. Voiding sale with Admin C's PIN
4. Closing till with Admin A's PIN
5. View transaction history
6. Expected: All actions show correct admin authorization ✓

### Test Case 5: Authorization Records
1. Complete transaction with admin authorization
2. Check database/audit trail
3. Verify records include:
   - Admin ID
   - Admin Name
   - Timestamp
   - Action type
   - Details
4. Expected: Complete audit trail available ✓

## Troubleshooting

### Opening Balance Dialog Not Appearing
- Check if till session already exists for today
- Verify user is logged in as Sales person
- Clear browser cache and reload

### PIN Verification Failing
- Ensure PIN is exactly 6 digits
- Verify PIN belongs to an Administrator account
- Check that PIN has not been changed

### Balance Mismatch
- Review transaction history
- Check for unrecorded withdrawals
- Verify sale amounts match receipts
- Compare opening + sales - withdrawals - voids = expected balance

### Users Can Create Admins When They Shouldn't
- Verify user is logged in as regular Administrator
- Check role dropdown is correctly restricted
- Verify server-side validation is in place

## Future Enhancements

1. Shift closing process with balance reconciliation
2. Daily till reports
3. Variance analysis and alerts
4. Automatic shift closing after X hours
5. Multi-till management
6. Till accountability reports
7. Daily settlement process
8. Escalation process for balance discrepancies
