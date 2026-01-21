# Card Payment Integration Setup Guide

## Overview
The Rhulani Tuck Shop POS system now supports card payment processing through professional payment gateways. This guide walks through setting up card machine integration.

## ✅ Current Integration Status

### Features Implemented
- ✓ Card payment option on POS checkout
- ✓ Real-time payment status feedback to user
- ✓ Automatic card transaction tracking
- ✓ Card transaction ID storage in sales records
- ✓ Both Sales and Withdrawals support card payments
- ✓ Professional card machine UI with visual feedback
- ✓ Stripe, Square, and PayFast gateway support
- ✓ Plug-and-play configuration system

### What Works
1. **POS Checkout**: Users can select "Card" as payment method
2. **Payment Status**: UI shows "Ready for Card Machine" or "Processing Card..." states
3. **Transaction Recording**: Card transactions are saved with unique IDs
4. **Dashboard Integration**: Card payments appear in all reports and analytics
5. **Withdrawal Cards**: Users can process card withdrawals (e.g., merchant advances)

## 🔧 Setup Instructions

### Step 1: Choose Your Payment Gateway

#### Option A: Stripe Terminal (Recommended for South Africa)
**Best for:** Professional retail POS, contactless/tap payments

1. Create account: https://stripe.com/za
2. Get API keys: https://dashboard.stripe.com/apikeys
3. Order Stripe Terminal device (iSC250, Wisepad 3, or BBPOS Chipper 2X)

Add to `.env.local`:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_STRIPE_TERMINAL_ID=tmr_your_terminal_id
```

#### Option B: Square Terminal
**Best for:** Integrated point-of-sale, multi-location setup

1. Create account: https://squareup.com/za
2. Get credentials: https://developer.squareup.com/apps
3. Download Square terminal app or use web reader

Add to `.env.local`:
```env
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq_your_app_id
SQUARE_ACCESS_TOKEN=sq_your_access_token
```

#### Option C: PayFast Gateway
**Best for:** Pure payment link (less real-time)

1. Register: https://www.payfast.co.za
2. Get merchant credentials
3. Configure in settings

### Step 2: Install Dependencies (if needed)

The app is pre-configured, but you may optionally install payment SDKs for advanced features:

```bash
# For Stripe Terminal SDK (optional - for advanced features)
npm install @stripe/terminal-js

# For Square Web Payments SDK (optional)
npm install square-web-payments-sdk
```

### Step 3: Test Card Payments

#### Test Mode (Development)
Use Stripe test cards:
- Visa: `4242 4242 4242 4242`
- Mastercard: `5555 5555 5555 4444`
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)

#### Production Mode
Once configured:
1. Switch API keys from test to live
2. Enable real card processing
3. All transactions will be processed through your payment gateway

### Step 4: Configure Firestore Rules

Rules have been updated to support card transactions. No manual changes needed, but verify:

```
- cardTransactionId field is allowed in Sales documents ✓
- Card withdrawal transactions are properly tracked ✓
```

## 📱 Using Card Payments on POS

### For Sales
1. Add products to cart
2. Select "Card" instead of "Cash"
3. Total displays "Ready for Card Machine"
4. Click "Complete Sale"
5. Insert/tap card on machine
6. App waits for card approval
7. Transaction saves with card ID

### For Withdrawals
1. Click "Withdrawal" button on POS
2. Choose payment method: "Card" (new!)
3. Enter amount
4. Optional: Add withdrawal reason
5. Confirm - processes card withdrawal

## 🔍 Monitoring & Troubleshooting

### Card Machine Not Responding
- Check USB/network connection to machine
- Verify API keys are correct in `.env.local`
- Restart POS application
- Check internet connectivity

### Transaction Failed
- Amount must be between R1 - R100,000
- Card machine timeout after 120 seconds
- Try again or use Cash as fallback
- Check Stripe/Square dashboard for detailed errors

### How to Check Transaction Status
1. Go to **Sales** page
2. Look for transaction with badge "Card"
3. View card transaction ID in details

## 📊 Reporting & Analytics

Card payments are fully integrated into all dashboards:
- **Dashboard**: Shows card vs cash breakdown
- **Till Audits**: Card sales auto-tracked (not manual count)
- **Cash-Up**: Displays card totals per salesperson
- **Reports**: All analytics include card transactions

## 🔐 Security Considerations

✓ **Card Data**: Never stored locally - processed by payment gateway  
✓ **API Keys**: Store in `.env.local` only, never commit to git  
✓ **Session Storage**: Temporary (not persistent)  
✓ **PCI Compliance**: Stripe/Square handle all compliance  
✓ **Test Mode**: No real charges in development  

## 📞 Support & Next Steps

### Common Issues
1. **"Card payment gateway not initialized"**
   - Add API key to `.env.local`
   - Restart development server
   - Reload POS page

2. **"Transaction amount invalid"**
   - Amount must be > R0 and < R100,000
   - Check cart total calculation

3. **"Card machine timeout"**
   - 120 second limit per transaction
   - Check machine connection/battery
   - Try fallback to Cash payment

### For Production Deployment
1. Switch to live API keys (remove `_test` suffix)
2. Enable 3D Secure for card security
3. Set up webhook endpoints for payment notifications
4. Configure settlement/payout schedule
5. Test with real transactions in low volume first

### Payment Gateway Documentation
- Stripe: https://stripe.com/docs/terminal
- Square: https://developer.squareup.com/docs/square-get-started
- PayFast: https://www.payfast.co.za/developers

## ✨ Features Coming Soon
- Receipt printing for card transactions
- Card machine battery status monitoring
- Transaction refund processing
- Multi-currency support
- Advanced reconciliation reports
