# Card Payment Testing Guide

## Testing Environment Setup

### Test Cards (Stripe Sandbox)
Use these cards for testing in development mode:

#### Successful Payments
- **Visa**: `4242 4242 4242 4242`
  - Expiry: Any future date (12/25)
  - CVC: Any 3 digits (123)
  - Result: Payment approved

- **Mastercard**: `5555 5555 5555 4444`
  - Expiry: Any future date (12/26)
  - CVC: Any 3 digits (456)
  - Result: Payment approved

#### Declined Payments (for error testing)
- **Visa (Declined)**: `4000 0000 0000 0002`
  - Expiry: Any future date
  - CVC: Any 3 digits
  - Result: Card declined

#### Special Cases
- **Insufficient Funds**: `4000 0000 0000 9995`
- **Lost Card**: `4000 0000 0000 9987`
- **Stolen Card**: `4000 0000 0000 9979`

---

## Test Scenarios

### ✅ Test 1: Basic Card Sale
**Objective**: Verify card payment works for standard POS transaction

**Steps**:
1. Login to POS page
2. Add 3-5 products to cart
3. Set tax rate to 15%
4. Select **Card** payment method
5. Verify UI shows "Ready for Card Machine"
6. Click **Complete Sale**
7. Enter card: `4242 4242 4242 4242`
8. Expiry: 12/25, CVC: 123
9. Complete payment

**Expected Results**:
- ✓ UI shows "Processing Card Payment..."
- ✓ Transaction ID generated (format: TXN-{timestamp}-{random})
- ✓ Sale record saved with `cardTransactionId`
- ✓ Cart cleared
- ✓ Receipt modal appears
- ✓ Success toast: "Card Payment Approved"
- ✓ Transaction appears in Sales dashboard

**Verification Steps**:
```
1. Check Sales page → New transaction should show Card badge
2. Click transaction → View cardTransactionId in details
3. Check Firestore → sales/{id} has cardTransactionId field
4. Check Till Audits → Card total updated
```

---

### ✅ Test 2: Card Sale with Different Amounts
**Objective**: Validate amount limits (R1 - R100,000)

**Test Cases**:
- **Amount: R0.50** → Should show "Invalid Card Amount" error
- **Amount: R1.00** → Should succeed ✓
- **Amount: R1,500.00** → Should succeed ✓
- **Amount: R100,000.00** → Should succeed ✓
- **Amount: R100,000.01** → Should show "Invalid Card Amount" error

**Expected Results**:
- Invalid amounts show toast: "Transaction amount must be between R1 and R100,000"
- Valid amounts process normally

---

### ✅ Test 3: Card Payment Decline Scenario
**Objective**: Verify error handling when card is declined

**Steps**:
1. Add products to cart
2. Select **Card** payment method
3. Click **Complete Sale**
4. Enter declined card: `4000 0000 0000 0002`
5. Expiry: 12/25, CVC: 123

**Expected Results**:
- ✓ UI shows processing spinner
- ✓ After ~2 seconds: Error toast appears
- ✓ Message: "Card Payment Failed - The card machine did not respond..."
- ✓ Cart remains intact (not cleared)
- ✓ User can retry or switch to Cash
- ✓ No sale record created
- ✓ No stock updated

---

### ✅ Test 4: Cash Withdrawal with Card
**Objective**: Verify card payments work for withdrawals

**Steps**:
1. On POS page, click **Withdrawal** button (wallet icon)
2. Enter amount: R500.00
3. Optional: Add reason "Merchant advance"
4. Select **Card** payment method (if available)
5. Click **Withdraw Cash**

**Expected Results**:
- ✓ Withdrawal transaction saved with `transactionType: 'withdrawal'`
- ✓ `cardTransactionId` included if card used
- ✓ Total shows as negative (R-500.00)
- ✓ Till Audits updated
- ✓ Success message: "R500.00 has been withdrawn and recorded"

---

### ✅ Test 5: Multi-Product Sale with Tax
**Objective**: Verify card payments work with complex calculations

**Setup**:
- Add 5 different products with different prices
- Quantities: 2, 3, 1, 4, 2
- Tax rate: 15%
- Expected subtotal: Variable
- Expected tax: Subtotal × 0.15

**Steps**:
1. Calculate expected total manually
2. Add all products to cart
3. Verify totals match calculation
4. Select **Card**
5. Complete sale with test card

**Expected Results**:
- ✓ Calculations accurate
- ✓ Card processing succeeds
- ✓ Receipt shows correct breakdown:
  - Subtotal
  - Tax amount
  - Total
  - Payment method: Card
  - Transaction ID
- ✓ All items deducted from stock

---

### ✅ Test 6: Multiple Card Transactions
**Objective**: Verify system handles multiple consecutive transactions

**Steps**:
1. Complete 3 card sales in sequence
2. Use same card for all transactions
3. Vary amounts: R50, R500, R2000
4. Use different product combinations

**Expected Results**:
- ✓ All 3 transactions complete successfully
- ✓ All 3 have unique transaction IDs
- ✓ All 3 appear in Sales dashboard
- ✓ Till Audits shows R2,550 card total
- ✓ No conflicts or data loss

---

### ✅ Test 7: Card Transaction Visibility
**Objective**: Verify card transactions appear in all relevant reports

**Checks**:
1. **Sales Page**:
   - Filter by payment method: Should show card transactions
   - Each transaction shows Card badge
   - Click to view cardTransactionId

2. **Dashboard**:
   - Card sales counted in total
   - Separate card vs cash breakdown
   - Card count accurate

3. **Till Audits**:
   - Card total calculated correctly
   - Manual cash count doesn't include card sales
   - Difference accurate (only manual cash)

4. **Reports**:
   - Card transactions included in daily/weekly/monthly reports
   - Payment method breakdown shows card percentage
   - Transaction IDs visible in export

---

### ✅ Test 8: Stock Updates with Card Sales
**Objective**: Verify inventory is correctly updated for card transactions

**Setup**:
- Product A: Stock = 100
- Product B: Stock = 50
- Add 10 of A and 5 of B to cart
- Complete card sale

**Expected Results**:
- ✓ Product A stock: 90 (100 - 10)
- ✓ Product B stock: 45 (50 - 5)
- ✓ Stock updates immediately after card approval
- ✓ Stock reflects in Products page and POS

---

### ✅ Test 9: Card Payment Session Persistence
**Objective**: Verify card state doesn't persist across sessions

**Steps**:
1. Start card payment (don't complete)
2. Refresh page (F5)
3. Add new products to cart
4. Process new card sale

**Expected Results**:
- ✓ Previous transaction state cleared
- ✓ New transaction processes independently
- ✓ No state bleeding between sessions
- ✓ Only new transaction saved to Firestore

---

### ✅ Test 10: Error Recovery
**Objective**: Verify system recovers gracefully from errors

**Scenarios**:

**A. Network Timeout**:
- Disable internet before clicking "Complete Sale"
- Wait 30 seconds
- Expected: Error toast, cart preserved, can retry

**B. Browser Crash**:
- Complete card sale
- Immediately close browser
- Reopen and check: Transaction should be saved

**C. Database Error**:
- Card payment succeeds
- Firestore write fails (simulate by disabling write rules temporarily)
- Expected: Error toast, cart preserved, transaction not saved

---

## Performance Testing

### ✅ Test 11: Card Payment Response Time
**Objective**: Verify acceptable performance

**Measurement**:
1. Note time when clicking "Complete Sale"
2. Measure time until success/error toast appears
3. Target: < 10 seconds

**Expected Results**:
- ✓ Simulation responds in ~2-5 seconds
- ✓ Real gateway should respond in 3-8 seconds
- ✓ UI responsive during processing

---

## Security Testing

### ✅ Test 12: Card Data Not Stored Locally
**Objective**: Verify PCI compliance

**Check**:
1. Open browser DevTools (F12)
2. Go to Application → Session Storage
3. Search for card number, CVC, expiry
4. Check localStorage

**Expected Results**:
- ✓ NO card data in sessionStorage
- ✓ NO card data in localStorage
- ✓ NO card data in cookies
- ✓ Card data only sent to payment gateway

---

## Verification Checklist

Use this checklist after completing tests:

```
✓ Test 1: Basic Card Sale - PASS/FAIL
✓ Test 2: Amount Validation - PASS/FAIL
✓ Test 3: Declined Card - PASS/FAIL
✓ Test 4: Card Withdrawal - PASS/FAIL
✓ Test 5: Multi-Product w/ Tax - PASS/FAIL
✓ Test 6: Multiple Transactions - PASS/FAIL
✓ Test 7: Report Visibility - PASS/FAIL
✓ Test 8: Stock Updates - PASS/FAIL
✓ Test 9: Session Persistence - PASS/FAIL
✓ Test 10: Error Recovery - PASS/FAIL
✓ Test 11: Performance - PASS/FAIL
✓ Test 12: Security - PASS/FAIL

Overall Status: ___________
Date Tested: ___________
Tester Name: ___________
Notes: ___________
```

---

## Troubleshooting During Testing

| Issue | Solution |
|-------|----------|
| "Card payment gateway not initialized" | Configure `.env.local` with payment gateway keys |
| "Invalid amount" error | Use amount between R1-R100,000 |
| Transaction doesn't appear in Sales | Wait 5 seconds, refresh page, check Firestore rules |
| Stock not updated | Verify Firestore write permissions |
| Payment succeeded but cart not cleared | Refresh page manually |
| Same transaction ID appears twice | Clear sessionStorage and refresh |

---

## Success Criteria

✅ All 12 tests pass
✅ No card data in browser storage
✅ All transactions saved correctly
✅ Stock updates accurate
✅ Reports show card transactions
✅ Error messages clear and actionable
✅ Response times acceptable
✅ No data loss on errors
