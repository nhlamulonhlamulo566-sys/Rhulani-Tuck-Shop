# Till Reconciliation System - Testing & Deployment Guide

## Build Status ✅
- **Latest Build**: Successful
- **All Compilation Errors**: Fixed
- **Routes Deployed**:
  - `/till-reconciliation` - Till Reconciliation Dashboard
  - `/daily-reports` - Daily Sales Reports
  - `/transaction-history` - Transaction History View
  - `/api/till-reconciliation` - Reconciliation API
  - `/api/daily-reports` - Daily Reports API
  - `/api/transaction-history` - Transaction History API

---

## Pre-Deployment Checklist

### Database Preparation
- [ ] Run migration: `docs/MIGRATION_2026_04_28_TILL_RECONCILIATION.sql`
  ```sql
  -- Execute in MySQL
  SOURCE /path/to/MIGRATION_2026_04_28_TILL_RECONCILIATION.sql;
  ```
- [ ] Verify tables created:
  ```sql
  SHOW TABLES LIKE '%reconciliation%';
  SHOW TABLES LIKE 'transaction_audit_log';
  ```
- [ ] Verify new columns in till_management:
  ```sql
  DESCRIBE till_management;
  ```

### Environment Configuration
- [ ] Verify MySQL connection string in `.env.local`
- [ ] Confirm SESSION_SECRET environment variable is set
- [ ] Check database user has permissions for new tables
- [ ] Verify PWA configuration if using with mobile

---

## User Testing Scenarios

### Scenario 1: Complete Till Cycle with PIN Auth

**Objective**: Test opening till, performing sales, and closing with reconciliation

**Steps**:
1. Login as Admin user
2. Navigate to `/pos`
3. Click "Open Till" button
4. Enter 6-digit PIN for authorization
5. Verify PIN dialog shows and requires valid PIN
6. After successful PIN, enter opening balance (e.g., R500.00)
7. Click "Start Session"
8. Verify session is created in Till Management
9. Perform 2-3 test sales (Cash and Card)
10. Click "Withdrawal" button
    - Enter PIN again when prompted
    - Enter withdrawal amount and reason
    - Verify withdrawal is recorded
11. Click "Close Till" button
    - Enter PIN when prompted
    - Enter closing balance
    - System calculates expected balance
12. Verify till session shows as "Closed"

**Expected Results**:
- ✅ PIN required for open, close, withdrawal
- ✅ Admin name shown during authorization
- ✅ All transactions recorded with proper amounts
- ✅ Closing balance calculated correctly

### Scenario 2: Till Reconciliation Review

**Objective**: Test the reconciliation dashboard

**Steps**:
1. Login as Super Admin
2. Navigate to `/till-reconciliation`
3. Review summary cards (Total Tills, Verified, Discrepancies, Pending)
4. Click "Details" on any till session
5. Verify balance breakdown shown:
   - Opening Balance
   - Total Sales
   - Total Withdrawals
   - Total Voids
   - Total Returns
   - Expected Balance
   - Actual Balance (Closing)
   - Difference
6. If difference < R0.01: Click "Approve Reconciliation"
   - Select "Verified - Balance Matches"
   - Add notes (optional)
   - Click "Approve"
7. If difference > R0.01: 
   - Select "Discrepancy - Variance Exists"
   - Add explanation notes
   - Click "Approve"
8. Verify reconciliation status updated to "Verified" or "Discrepancy"
9. Verify approval details show admin name and timestamp

**Expected Results**:
- ✅ Till sessions displayed with current status
- ✅ Balance calculations accurate
- ✅ Reconciliation approval workflow functional
- ✅ Admin approval recorded

### Scenario 3: Transaction History Filtering

**Objective**: Test transaction history view and filtering

**Steps**:
1. Navigate to `/transaction-history`
2. Review summary statistics (Total, Sales, Withdrawals, Adjustments)
3. Filter by transaction type:
   - Select "Sales" → Verify only sales shown
   - Reset and select "Withdrawals" → Verify only withdrawals shown
   - Reset and select "Voids" → Verify only voids shown
4. Filter by date range:
   - Enter yesterday's date as start
   - Enter today's date as end
   - Click "Filter"
   - Verify only transactions in range shown
5. Click "Export CSV" button
   - Verify file downloads
   - Open CSV and verify columns and data

**Expected Results**:
- ✅ Filters work independently and in combination
- ✅ All transaction types displayed correctly
- ✅ CSV export contains all transaction data
- ✅ Date filtering accurate to timezone

### Scenario 4: Daily Reports

**Objective**: Test daily sales reporting

**Steps**:
1. Navigate to `/daily-reports`
2. Review summary cards:
   - Total Sales
   - Net Sales (after adjustments)
   - Total Withdrawals
   - Adjustments (voids + returns)
   - Payment breakdown (Cash vs Card)
3. Scroll down to daily summary table
4. Verify each day shows:
   - Sales count
   - Total sales amount
   - Cash/Card breakdown
   - Withdrawal amount
   - Void amount
   - Return amount
   - Net sales for day
   - Number of unique salespersons
5. Set custom date range:
   - Select start date (7 days ago)
   - Select end date (today)
   - Click "Filter"
   - Verify only those dates shown
6. Click "Reset" to see 30-day default

**Expected Results**:
- ✅ Summary statistics calculated correctly
- ✅ Daily breakdown shows all required metrics
- ✅ Payment method breakdown accurate
- ✅ Date filtering works as expected
- ✅ Percentages calculated correctly

### Scenario 5: Role-Based Access Control

**Objective**: Verify RBAC restrictions

**Steps**:
1. **As Super Admin**:
   - Can access all pages (Dashboard, Till Management, Reconciliation, Reports)
   - Can manage all admin features
   
2. **As Admin (non-Super)**:
   - Can access Dashboard, Till Management, Reconciliation
   - Cannot create other Admin accounts (dropdown shows only "Sales")
   - Can approve till reconciliations
   
3. **As Sales**:
   - Can ONLY access POS page
   - Attempting to access `/dashboard` redirects to `/pos`
   - Attempting to access `/till-management` redirects to `/pos`

**Expected Results**:
- ✅ Navigation filtered by role
- ✅ Auto-redirect for unauthorized routes
- ✅ Admin creation restrictions enforced
- ✅ Sales users isolated to POS only

### Scenario 6: PIN Authorization for Sensitive Operations

**Objective**: Test PIN authorization requirement for all critical operations

**Operations to test**:
1. Till Opening
   - Click "Open Till" → PIN required ✓
   - Verify PIN dialog appears ✓
   - Cancel PIN → Dialog closes, session not created ✓
   
2. Till Closing
   - Click "Close Till" → PIN required ✓
   - Verify closing balance dialog appears after PIN ✓
   
3. Withdrawal
   - Click "Withdrawal" → PIN required ✓
   - Verify reason dialog appears after PIN ✓
   
4. Void Sale
   - Click "Void" on a sale → PIN required ✓
   - Verify void is executed after PIN ✓

**Expected Results**:
- ✅ PIN always required for these operations
- ✅ Admin name and timestamp recorded
- ✅ Operations blocked without valid PIN
- ✅ Authorization details visible in transaction history

---

## Performance Testing

### API Response Times
- [ ] GET `/api/till-reconciliation` with 100+ sessions: < 500ms
- [ ] GET `/api/transaction-history` with 1000+ transactions: < 1000ms
- [ ] GET `/api/daily-reports` for 30-day range: < 500ms

### Database Query Optimization
- [ ] Verify indexes are created:
  ```sql
  SHOW INDEXES FROM till_management;
  SHOW INDEXES FROM transaction_audit_log;
  SHOW INDEXES FROM reconciliation_history;
  ```

---

## Data Validation Testing

### Balance Calculation Accuracy
```
Test Case: Simple Till Session
- Opening Balance: R1000.00
- Sales: R500.00, R300.00, R200.00 (Total: R1000.00)
- Withdrawals: R100.00, R50.00 (Total: R150.00)
- Voids: R100.00
- Returns: R50.00

Expected Balance = 1000 + 1000 - 150 - 100 + 50 = R1800.00
```

Verify:
- [ ] Expected balance calculated correctly
- [ ] If closing balance = R1800.00 → Status: Verified ✓
- [ ] If closing balance = R1800.50 → Status: Verified (within tolerance) ✓
- [ ] If closing balance = R1700.00 → Status: Discrepancy ✓

### Transaction Type Recording
- [ ] Sales recorded as 'sale'
- [ ] Withdrawals recorded as 'withdrawal'
- [ ] Voids recorded as 'void'
- [ ] Returns recorded as 'return'

---

## Troubleshooting Guide

### Issue: "Till sessions not loading"
**Cause**: Database migration not run
**Solution**: 
1. Verify migration file exists: `docs/MIGRATION_2026_04_28_TILL_RECONCILIATION.sql`
2. Run migration in MySQL: `SOURCE migration_file_path`
3. Verify tables exist: `SHOW TABLES;`

### Issue: "PIN authorization not appearing"
**Cause**: Component not properly imported
**Solution**:
1. Check import in pos/page.tsx: `import PinAuthDialog from '@/components/auth/pin-auth-dialog';`
2. Verify dialog state: `const [pinAuthOpen, setPinAuthOpen] = useState(false);`

### Issue: "Balance calculation incorrect"
**Cause**: Wrong transaction types in query
**Solution**:
1. Verify transaction types in database: `SELECT DISTINCT transactionType FROM sales;`
2. Ensure migration updated enum to include 'void' and 'return'
3. Check API query filters correct types

### Issue: "Sales user can access admin pages"
**Cause**: Navigation filtering not working
**Solution**:
1. Verify layout.tsx includes role check:
   ```typescript
   if (userProfile.role === 'Sales' && pathname !== '/pos') {
     router.replace('/pos');
   }
   ```
2. Check sessionStorage key: Should be 'currentUser'
3. Verify user.role value matches 'Sales' exactly

### Issue: "CSV export empty"
**Cause**: Transaction query returning no results
**Solution**:
1. Verify transactions exist in database: `SELECT * FROM sales LIMIT 10;`
2. Check date filtering in API
3. Verify transaction types are correct

---

## Rollback Procedure

If issues occur in production:

1. **Disable new features**:
   - Remove navigation items in layout.tsx
   - Revert to previous navigation array

2. **Database rollback**:
   ```sql
   -- Drop new tables (if needed)
   DROP TABLE IF EXISTS reconciliation_history;
   DROP TABLE IF EXISTS transaction_audit_log;
   
   -- Drop new columns from till_management
   ALTER TABLE till_management 
   DROP COLUMN startedBy,
   DROP COLUMN closedBy,
   DROP COLUMN reconciliationNotes,
   DROP COLUMN reconciliationStatus,
   DROP COLUMN reconciliationApprovedBy,
   DROP COLUMN reconciliationApprovedAt,
   DROP COLUMN difference,
   DROP COLUMN varianceReason;
   ```

3. **Revert code**:
   - Restore previous version from git
   - Rebuild and redeploy

---

## Post-Deployment Verification

After deployment to production:

- [ ] Till reconciliation dashboard loads without errors
- [ ] PIN authorization works for till operations
- [ ] Daily reports show accurate data
- [ ] Transaction history filters work correctly
- [ ] Role-based access restrictions enforced
- [ ] Database performance acceptable
- [ ] Audit tables growing (new transactions recorded)
- [ ] No errors in application logs

---

## Monitoring & Maintenance

### Daily Checks
- [ ] No failed reconciliations marked as "discrepancy"
- [ ] All till sessions properly closed at end of day
- [ ] No orphaned transactions in audit log

### Weekly Checks
- [ ] Review reconciliation history for patterns
- [ ] Verify database size growing appropriately
- [ ] Check for slow queries in till-reconciliation API

### Monthly Maintenance
- [ ] Archive old reconciliation history (if needed)
- [ ] Verify backup includes new tables
- [ ] Review system performance metrics

---

## Contact & Support

For issues or questions:
1. Check troubleshooting section above
2. Review implementation summary: `IMPLEMENTATION_SUMMARY.md`
3. Check database schema: `docs/db-schema.sql`
4. Review API documentation: Inline comments in route.ts files

---

**Last Updated**: 2025-04-28
**Version**: 1.0 - Production Ready
