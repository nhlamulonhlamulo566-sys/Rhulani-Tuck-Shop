# South African Payment Gateway Integration Guide

This document provides comprehensive integration details for supporting South African payment gateways in the Rhulani Tuck Shop POS system.

## Supported South African Payment Gateways

The system now supports the following South African payment gateways:

1. **Payfast** ✅ (Primary)
2. **Capitec** ✅
3. **Nedbank** ✅
4. **FNB (First National Bank)** ✅
5. **ABSA** ✅

## Gateway Specifications

### 1. Payfast

**Overview:** Payfast is South Africa's leading payment gateway for online transactions.

**Credentials Required:**
- **Merchant ID**: Your unique Payfast merchant identifier
- **Merchant Key**: Your secure merchant key for API authentication

**Configuration:**
```json
{
  "merchantName": "Your Store Name",
  "merchantId": "10000100",
  "apiKey": "your_merchant_id",
  "apiSecret": "your_merchant_key",
  "gatewayType": "Payfast",
  "testMode": true,
  "contactEmail": "support@yourstore.co.za",
  "supportContact": "https://www.payfast.co.za/support"
}
```

**Testing Credentials:**
- Test URL: https://sandbox.payfast.co.za
- Test Mode: Enabled by default

**Key Features:**
- Instant payment notifications (IPN)
- Secure checkout process
- Recurring billing support
- Multiple currency support (ZAR, USD, EUR, GBP)

**Documentation:** https://www.payfast.co.za/documentation

**Support:** support@payfast.co.za | +27 21 557 0850

---

### 2. Capitec Bank Gateway

**Overview:** Capitec Bank's payment processing solution for merchants.

**Credentials Required:**
- **API Key**: Your Capitec API key
- **API Secret**: Your Capitec API secret

**Configuration:**
```json
{
  "merchantName": "Your Store Name",
  "merchantId": "CAPITEC_MERCHANT_ID",
  "apiKey": "your_capitec_api_key",
  "apiSecret": "your_capitec_api_secret",
  "gatewayType": "Capitec",
  "testMode": true,
  "contactEmail": "merchant@capitec.co.za",
  "supportContact": "https://www.capitec.co.za/business"
}
```

**Testing Credentials:**
- Test URL: https://sandbox-api.capitec.co.za
- Test Mode: Enabled by default

**Key Features:**
- Low transaction fees
- Fast settlement (24-48 hours)
- Real-time transaction updates
- PCI DSS Level 1 compliant

**Documentation:** https://www.capitec.co.za/merchant-services

**Support:** merchant@capitec.co.za | 0860 888 888

---

### 3. Nedbank Gateway

**Overview:** Nedbank's enterprise payment processing platform.

**Credentials Required:**
- **API Key**: Your Nedbank API key
- **API Secret**: Your Nedbank API secret

**Configuration:**
```json
{
  "merchantName": "Your Store Name",
  "merchantId": "NEDBANK_MERCHANT_ID",
  "apiKey": "your_nedbank_api_key",
  "apiSecret": "your_nedbank_api_secret",
  "gatewayType": "Nedbank",
  "testMode": true,
  "contactEmail": "payments@nedbank.co.za",
  "supportContact": "https://www.nedbank.co.za"
}
```

**Testing Credentials:**
- Test URL: https://sandbox.nedbank.co.za
- Test Mode: Enabled by default

**Key Features:**
- Advanced fraud detection
- Multi-currency processing
- Automated reconciliation
- Comprehensive reporting

**Documentation:** https://www.nedbank.co.za/business/merchant-services

**Support:** payments@nedbank.co.za | 0860 111 331

---

### 4. FNB (First National Bank) Gateway

**Overview:** FNB's comprehensive payment processing solution for retail merchants.

**Credentials Required:**
- **API Key**: Your FNB API key
- **API Secret**: Your FNB API secret

**Configuration:**
```json
{
  "merchantName": "Your Store Name",
  "merchantId": "FNB_MERCHANT_ID",
  "apiKey": "your_fnb_api_key",
  "apiSecret": "your_fnb_api_secret",
  "gatewayType": "FNB",
  "testMode": true,
  "contactEmail": "merchant@fnb.co.za",
  "supportContact": "https://www.fnb.co.za"
}
```

**Testing Credentials:**
- Test URL: https://sandbox.fnb.co.za
- Test Mode: Enabled by default

**Key Features:**
- Flexible payment options
- Merchant dashboard
- Transaction monitoring
- Integration with FNB banking services

**Documentation:** https://www.fnb.co.za/merchant-services

**Support:** merchant@fnb.co.za | 0860 100 200

---

### 5. ABSA Bank Gateway

**Overview:** ABSA's merchant payment solutions with enterprise features.

**Credentials Required:**
- **API Key**: Your ABSA API key
- **API Secret**: Your ABSA API secret

**Configuration:**
```json
{
  "merchantName": "Your Store Name",
  "merchantId": "ABSA_MERCHANT_ID",
  "apiKey": "your_absa_api_key",
  "apiSecret": "your_absa_api_secret",
  "gatewayType": "ABSA",
  "testMode": true,
  "contactEmail": "merchant@absa.co.za",
  "supportContact": "https://www.absa.co.za"
}
```

**Testing Credentials:**
- Test URL: https://sandbox.absa.co.za
- Test Mode: Enabled by default

**Key Features:**
- Advanced security protocols
- Real-time settlement options
- Comprehensive analytics
- Multi-location support

**Documentation:** https://www.absa.co.za/business/merchant

**Support:** merchant@absa.co.za | 0860 111 662

---

## Database Schema

All gateway configurations are stored in the `merchant_gateway_config` table:

```sql
CREATE TABLE merchant_gateway_config (
  id VARCHAR(36) PRIMARY KEY,
  merchantName VARCHAR(255) NOT NULL,
  merchantId VARCHAR(100) UNIQUE NOT NULL,
  apiKey VARCHAR(255) NOT NULL,
  apiSecret VARCHAR(255) NOT NULL,
  gatewayType ENUM('Payfast', 'PayU', 'Stripe', 'Square', 'Capitec', 'Nedbank', 'FNB', 'ABSA', 'Custom') NOT NULL,
  testMode BOOLEAN DEFAULT true,
  isActive BOOLEAN DEFAULT true,
  contactEmail VARCHAR(255),
  contactPhone VARCHAR(20),
  supportContact TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Setup Instructions

### Step 1: Register with Payment Gateway

1. Visit the gateway provider's website
2. Complete merchant registration
3. Verify business details and banking information
4. Obtain API credentials (Key and Secret)

### Step 2: Configure in POS System

1. Navigate to **Card Machine Configuration** page
2. Click **Add New Gateway**
3. Fill in the gateway details:
   - **Merchant Name**: Your business name
   - **Merchant ID**: ID provided by gateway
   - **API Key**: Your authentication key
   - **API Secret**: Your authentication secret
   - **Gateway Type**: Select from dropdown
   - **Test Mode**: Toggle for testing
   - **Contact Email**: Support email
   - **Support Contact**: Support URL/Phone

### Step 3: Test Connection

1. Enable **Test Mode** in configuration
2. Click **Test Connection** button
3. Verify connection status shows "Connected"
4. Process a test transaction

### Step 4: Deploy to Production

1. Disable **Test Mode**
2. Verify all credentials are correct
3. Enable **Active** toggle
4. Start processing live transactions

---

## Connection Requirements

### Network Requirements
- **Outbound HTTPS (443)** to gateway endpoints
- **Firewall**: Allow connections to gateway IPs
- **TLS 1.2+** minimum encryption

### System Requirements
- **Node.js** 16.x or higher
- **MySQL** 8.x or higher
- **Next.js** 15.x

### Security Requirements
- All API credentials must be stored securely
- Use environment variables for sensitive data
- Enable HTTPS for all transactions
- Implement PCI DSS compliance

---

## Integration API Reference

### API Endpoint Structure

```
POST /api/card-machine
Content-Type: application/json

{
  "type": "gateway",
  "merchantName": "string",
  "merchantId": "string",
  "apiKey": "string",
  "apiSecret": "string",
  "gatewayType": "Payfast|Capitec|Nedbank|FNB|ABSA|PayU|Stripe|Square|Custom",
  "testMode": boolean,
  "isActive": boolean,
  "contactEmail": "string",
  "contactPhone": "string",
  "supportContact": "string"
}
```

### Response Format

```json
{
  "id": "uuid",
  "merchantName": "Your Store Name",
  "merchantId": "MERCHANT_ID",
  "gatewayType": "Payfast",
  "testMode": true,
  "isActive": true,
  "createdAt": "2026-04-24T10:00:00Z",
  "updatedAt": "2026-04-24T10:00:00Z"
}
```

---

## Transaction Processing Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     POS Transaction                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Card Machine Configuration                      │
│         (Route selection based on payment method)             │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    Payfast          Capitec         Nedbank
    ┌───┐            ┌────┐          ┌──────┐
    │API│            │API │          │ API  │
    └───┘            └────┘          └──────┘
    
    ┌───┐            ┌────┐
    │FNB│            │ABSA│
    └───┘            └────┘
         │               │
         └───────────────┴─────────────────┬──────────────────┐
                                          │                  │
                                          ▼                  ▼
                            ┌──────────────────────────────────────┐
                            │   Transaction Processing Engine      │
                            │  - Validation                       │
                            │  - Encryption                       │
                            │  - Settlement                       │
                            └──────────────────────────────────────┘
                                          │
                                          ▼
                            ┌──────────────────────────────────────┐
                            │   Transaction Log Database           │
                            │  - Record storage                    │
                            │  - Audit trail                       │
                            │  - Reconciliation                    │
                            └──────────────────────────────────────┘
```

---

## Testing & Validation

### Test Transaction Cards

Each gateway provides test card numbers for development:

**Payfast:**
- Card: 4111 1111 1111 1111
- Expiry: 06/25
- CVV: 123

**Capitec:**
- Contact: merchant@capitec.co.za for test details

**Nedbank:**
- Contact: payments@nedbank.co.za for test details

**FNB:**
- Contact: merchant@fnb.co.za for test details

**ABSA:**
- Contact: merchant@absa.co.za for test details

### Validation Checklist

- [ ] Gateway credentials are correct
- [ ] Test mode is enabled
- [ ] Network connectivity to gateway verified
- [ ] API key and secret are stored securely
- [ ] TLS certificate is valid
- [ ] Test transaction completed successfully
- [ ] Transaction appears in gateway dashboard
- [ ] Reconciliation data matches
- [ ] Error handling is working
- [ ] Audit logs are being recorded

---

## Troubleshooting

### Common Issues

**Issue: "Connection Failed"**
- Verify API credentials are correct
- Check test mode is enabled
- Ensure network connectivity to gateway
- Verify firewall allows outbound HTTPS

**Issue: "Invalid Credentials"**
- Confirm merchantId matches gateway registration
- Check API key and secret are not expired
- Verify no extra spaces in credentials
- Re-generate credentials if needed

**Issue: "Transaction Timeout"**
- Check gateway status page
- Verify network latency
- Ensure sufficient connection timeout settings
- Check if gateway is under maintenance

**Issue: "Settlement Delay"**
- Contact gateway support
- Verify bank account details
- Check if any compliance verification is pending
- Review transaction status in gateway dashboard

---

## Security Best Practices

1. **Environment Variables**: Store all credentials in .env.local
2. **HTTPS Only**: Always use HTTPS for card data transmission
3. **PCI Compliance**: Never store card numbers in database
4. **Audit Logging**: Maintain transaction audit trails
5. **Regular Updates**: Keep payment libraries updated
6. **Rate Limiting**: Implement API rate limiting
7. **Error Handling**: Never expose sensitive data in error messages
8. **Encryption**: Use strong encryption for data at rest

---

## Role-Based Access Control

Gateway configuration and transaction management requires appropriate roles:

- **Super Administrator**: Full access to all gateways and configurations
- **Administrator**: Can create and manage gateways (limited to assigned merchants)
- **Sales**: Can process transactions through configured gateways
- **View Only**: Can view transaction history and reports

---

## Support & Resources

| Gateway | Contact | Website | Support Hours |
|---------|---------|---------|----------------|
| Payfast | support@payfast.co.za | https://www.payfast.co.za | 24/7 |
| Capitec | merchant@capitec.co.za | https://www.capitec.co.za | Mon-Fri 8am-6pm |
| Nedbank | payments@nedbank.co.za | https://www.nedbank.co.za | Mon-Fri 8am-5pm |
| FNB | merchant@fnb.co.za | https://www.fnb.co.za | Mon-Fri 8am-5pm |
| ABSA | merchant@absa.co.za | https://www.absa.co.za | Mon-Fri 8am-5pm |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-24 | Initial South African payment gateway integration |

---

## Next Steps

1. Register with your preferred payment gateway
2. Obtain API credentials
3. Configure gateway in POS system
4. Test with provided test card numbers
5. Deploy to production when ready
6. Monitor transactions and reconciliation
7. Contact gateway support if issues arise
