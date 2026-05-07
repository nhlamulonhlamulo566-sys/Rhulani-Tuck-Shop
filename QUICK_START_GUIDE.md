# Quick Start Guide - Till Reconciliation System

## For Administrators

### Accessing Till Reconciliation Dashboard

1. **Login** to the admin panel
2. **Click** "Till Reconciliation" in the navigation menu
3. You'll see:
   - **Summary cards**: Total tills, Verified, Discrepancies, Pending
   - **Till sessions table**: All till sessions with their status

### Reviewing Till Reconciliation

1. **Find the till session** you want to review in the table
2. **Click "Details"** button to view:
   - Opening and closing balance
   - Sales, withdrawals, voids, returns totals
   - Expected vs actual balance
   - Difference amount
3. **Click "Approve Reconciliation"** if pending:
   - Select status: "Verified" (balance matches) or "Discrepancy" (variance exists)
   - Add notes explaining any discrepancies
   - Click "Approve"
4. The till is now marked as verified/reconciled with your approval

### Daily Reports

1. **Click "Daily Reports"** in the navigation
2. **View summary cards** showing:
   - Total sales and net sales
   - Payment breakdown (Cash vs Card)
   - Withdrawal and adjustment totals
3. **Scroll to daily table** to see breakdown by date
4. **Filter by date range**:
   - Enter start and end dates
   - Click "Filter"
   - Default shows last 30 days

### Transaction History

1. **Click "Transaction History"** in the navigation
2. **Filter by**:
   - Transaction type (Sales, Withdrawals, Voids, Returns)
   - Date range
3. **Export to CSV**:
   - Click "Export CSV" button
   - File will download with all filtered transactions
4. **Review details**:
   - Each transaction shows date, type, amount, and authorized by

---

## For Sales Personnel

### Opening Till (POS)

1. **Login** to the POS system
2. You'll see **"Open Till"** button at the top
3. **Click "Open Till"**
4. **Enter PIN** (6-digit code provided by manager)
   - Your manager must authorize till opening with their PIN
5. **Enter opening balance** (e.g., R500.00)
   - This is the cash you're starting with
6. Click **"Start"** to begin your shift

### During Your Shift

#### Making a Sale
1. **Select products** from the menu
2. **Enter quantity** for each product
3. **Choose payment method** (Cash or Card)
4. Click **"Complete Sale"**
5. Sale is recorded automatically

#### Withdrawing Cash
1. **Click "Withdrawal"** button
2. **Enter your PIN** when prompted
3. **Enter amount** you're withdrawing
4. **Enter reason** (e.g., "Change for customer")
5. Click **"Confirm"**
6. Withdrawal is recorded

#### Voiding a Sale
1. **Click "Void"** next to the sale you want to cancel
2. **Enter PIN** when prompted
3. **Select reason** from dropdown
4. Click **"Confirm Void"**
5. Sale is marked as voided

### Closing Till

1. **Click "Close Till"** button when your shift ends
2. **Enter PIN** when prompted (manager must authorize)
3. **Enter closing balance** (total cash in till)
4. System calculates expected balance automatically
5. Click **"Close Till"** to complete shift
6. Till is now closed and ready for reconciliation

---

## Understanding the Balance Calculation

### Formula
```
Expected Balance = Opening Balance + Sales - Withdrawals - Voids + Returns
```

### Example
- Opening Balance: R1,000
- Sales: R2,500
- Withdrawals: -R300
- Voids: -R200
- Returns: +R100

**Expected Balance = R1,000 + R2,500 - R300 - R200 + R100 = R3,100**

If your closing balance = R3,100 → **Reconciliation verified ✓**
If your closing balance = R3,050 → **Discrepancy flagged** (R50 difference)

---

## PIN Authorization Explained

### Why PIN Required?
PIN authorization ensures that sensitive operations (till opening/closing, withdrawals, voids) are authorized by a manager. This prevents unauthorized cash removal and maintains accountability.

### Who Has PIN?
- **Super Administrator**: Full system access, can create other admins, authorize operations
- **Administrator**: Limited admin access, can authorize operations
- **Sales Personnel**: Can perform sales, but cannot authorize operations (manager PIN required)

### PIN Examples

**Scenario 1: Till Opening**
```
1. Salesperson clicks "Open Till"
2. Dialog appears asking for PIN
3. Manager enters their 6-digit PIN
4. If valid: Opening balance dialog shows
5. If invalid: Error message, try again
```

**Scenario 2: Cash Withdrawal**
```
1. Salesperson needs R100 for change
2. Clicks "Withdrawal"
3. Manager PIN dialog appears
4. Manager enters PIN
5. Salesperson enters amount and reason
6. Withdrawal recorded with manager's name and timestamp
```

---

## Status Indicators

### Till Status
- **Active** 🟢 - Till is open, sales in progress
- **Closed** ⚫ - Till is closed, waiting for reconciliation
- **Verified** ✅ - Reconciliation approved, balances match
- **Discrepancy** ⚠️ - Reconciliation approved but variance exists
- **Pending** 🟡 - Closed but not yet reconciled

### Reconciliation Status
- **Pending**: Till closed, waiting for admin review
- **Verified**: Admin confirmed balance matches expected
- **Discrepancy**: Admin flagged variance and approved with notes

---

## Common Issues & Solutions

### "PIN Dialog Not Appearing"
**What's wrong**: Manager's PIN code not configured
**Solution**: Contact your Super Administrator to set PIN

### "Balance Doesn't Match"
**What might be wrong**:
- Forgot to record a withdrawal
- Sale amount entered incorrectly
- Cash counting error

**Solution**: 
1. Check all transactions in Transaction History
2. Recount cash in till
3. Contact manager to investigate discrepancy

### "Can't Close Till"
**What's wrong**: Might be due to pending authorizations or system error
**Solution**:
1. Verify all transactions completed
2. Check if PIN authorized properly
3. Try again or contact administrator

### "Withdrawal Showing Wrong Amount"
**What's wrong**: Amount may have been mistyped or transaction not saved
**Solution**:
1. Check Transaction History
2. Verify amount in till
3. Contact manager to investigate

---

## Data Privacy & Security

### Your Data
- All transactions are recorded with:
  - Date and time
  - Amount
  - Your name (salesperson)
  - Authorized by (manager name)
  - Reason (for withdrawals/voids)

### PIN Security
- PINs are encrypted in database
- Never share your PIN
- Managers have responsibility for PIN security

### Access Control
- Only administrators can view Till Reconciliation
- Only Super Administrators can view all admin reports
- Salespersons only see their own sales

---

## Tips for Success

### For Sales Personnel
1. **Open till at shift start** - Don't skip this step
2. **Record all transactions** - Sales, withdrawals, voids
3. **Keep accurate count** - Recount cash to verify closing balance
4. **Close till at shift end** - Manager must authorize with PIN
5. **Save receipt** - Keep transaction printout for reference

### For Administrators
1. **Review daily** - Check till reconciliations each day
2. **Approve quickly** - Process pending reconciliations promptly
3. **Investigate discrepancies** - Understand variances before approving
4. **Monitor trends** - Use daily reports to spot patterns
5. **Audit regularly** - Review transaction history for anomalies

---

## Useful Shortcuts

### Navigation
- `/pos` - Point of Sale
- `/till-reconciliation` - Till Reconciliation Dashboard
- `/daily-reports` - Daily Sales Reports
- `/transaction-history` - Transaction History
- `/settings` - User Management

### Keyboard Shortcuts (in POS)
- `Ctrl+S` - Complete Sale (if supported)
- `Ctrl+W` - Withdrawal
- `Ctrl+X` - Void Sale

---

## Support & Help

### Getting Help
1. Check the issue in "Common Issues & Solutions" above
2. Review Dashboard for status indicators
3. Contact your system administrator
4. Check application logs for error messages

### For Developers
- See `IMPLEMENTATION_SUMMARY.md` for technical overview
- See `DEPLOYMENT_TESTING_GUIDE.md` for testing procedures
- Check inline API documentation in source code

---

**Last Updated**: 2025-04-28
**System Version**: 1.0
**Status**: Production Ready
