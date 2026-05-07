# Rhulani Tuck Shop POS System - Complete Documentation

**Version:** 1.0.0  
**Date:** April 24, 2026  
**Status:** Production Ready

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Installation & Setup](#installation--setup)
3. [User Guides](#user-guides)
4. [API Documentation](#api-documentation)
5. [Database Schema](#database-schema)
6. [Security](#security)
7. [Troubleshooting](#troubleshooting)
8. [Support](#support)

---

## System Overview

### What is Rhulani Tuck Shop POS?

Rhulani Tuck Shop POS is a comprehensive Point of Sale system designed for retail businesses in South Africa. It provides:

- **Sales Management**: Fast, efficient transaction processing
- **Inventory Management**: Real-time stock tracking
- **PIN Security**: 6-digit PIN authentication with 24-hour rotation
- **Card Payment Integration**: Support for major SA payment gateways
- **Till Management**: Cash handling and reconciliation
- **Reporting & Analytics**: Comprehensive sales reports
- **User Management**: Role-based access control

### Key Features

✅ **Multi-User Support** - Different roles (Sales, Administration, Super Administration)  
✅ **Real-time Inventory** - Track stock levels in real-time  
✅ **Secure Transactions** - PIN-protected admin functions  
✅ **Payment Gateway Integration** - Payfast, Capitec, Nedbank, FNB, ABSA  
✅ **Professional Receipts** - Print or digital receipts  
✅ **Comprehensive Reporting** - Sales, inventory, and till reports  
✅ **Data Export** - Export reports to various formats  
✅ **Mobile Responsive** - Works on desktop and tablets  

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Frontend                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  POS Interface  │  Admin Panel  │  Reports  │  Settings│ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────┬──────────────────────────────────┘
                          │ REST API
┌─────────────────────────┴──────────────────────────────────┐
│                  Next.js API Routes                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Sales │ Products │ Users │ Till │ Card Machine │ Auth │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────┬──────────────────────────────────┘
                          │ SQL Queries
┌─────────────────────────┴──────────────────────────────────┐
│                   MySQL Database                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Users │ Products │ Sales │ Till Sessions │ Gateways    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Installation & Setup

### Prerequisites

- **Node.js** 16.x or higher
- **MySQL** 8.x or higher
- **npm** or **yarn** package manager
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

### System Requirements

- **RAM**: Minimum 2GB, Recommended 4GB+
- **Storage**: Minimum 5GB
- **Network**: Stable internet connection for payment processing
- **Operating System**: Windows, macOS, or Linux

### Installation Steps

#### Step 1: Clone/Download Project

```bash
cd /path/to/projects
git clone <repository-url>
cd "Rhulani Tuck Shop"
```

#### Step 2: Install Dependencies

```bash
npm install
```

#### Step 3: Configure Environment Variables

Create `.env.local` file in the project root:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=rhulanituckshop
DATABASE_USER=root
DATABASE_PASSWORD=your_password

# Session Configuration
SESSION_SECRET=your_secure_random_string_here

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

#### Step 4: Initialize Database

```bash
npm run db:init
```

This will:
- Create all required tables
- Set up indexes
- Insert sample data
- Configure initial users

#### Step 5: Create Initial User

```bash
npm run create:user
```

Follow prompts to create your super administrator account.

#### Step 6: Start Development Server

```bash
npm run dev
```

Access at: http://localhost:3000

---

## User Guides

### Dashboard Administrator

#### Daily Startup Checklist

1. **Log in** with your administrator credentials
2. **Generate Daily PIN** - Navigate to Admin PIN page, click "Generate New PIN"
3. **Review Till Status** - Check till management for open sessions
4. **Verify Stock** - Check low stock alerts
5. **Monitor Sales** - Review sales from previous day

#### Managing Products

1. Go to **Products** section
2. Click **Add Product** to create new item
3. Fill in details:
   - Product name
   - Category
   - Price
   - Stock quantity
   - Low stock threshold
   - Product image (optional)
   - Barcode (optional)

4. Click **Save**

**Tips:**
- Use barcodes for faster scanning
- Set accurate stock thresholds
- Update prices regularly
- Add product images for quick identification

#### Processing Sales (POS)

1. Navigate to **POS** section
2. Select products by:
   - Searching by name
   - Scanning barcode
   - Browsing categories
3. Adjust quantities as needed
4. Review cart totals
5. Select payment method (Card/Cash/Transfer)
6. Process payment
7. Print or email receipt
8. Verify stock deduction

**Shortcuts:**
- **Barcode Scanner** - Connect USB scanner for faster scanning
- **Quick Search** - Start typing product name
- **Quantity Edit** - Click quantity field to adjust
- **Clear Cart** - Start new transaction

#### Till Management

1. Go to **Till Management**
2. **Start Session** - Open till with opening balance
3. **Process Sales** - Transactions auto-added
4. **End Session** - Count physical cash and enter amount
5. **System** compares expected vs. counted cash
6. Review variance
7. Save till audit

**Reconciliation:**
- Expected Cash = Opening Balance + Card Sales + Cash Received - Discounts
- Counted Cash = Physical count
- Variance = Counted Cash - Expected Cash

#### Handling Returns

1. Go to **Returns** section
2. **Find Transaction** - Enter or scan Sale ID
3. **Select Items** - Choose which items to return
4. **Enter Quantities** - How many units returned
5. **Process Return** - Requires PIN authorization
6. Stock automatically restored
7. Refund processed to original payment method

#### Reports

1. Navigate to **Reports**
2. Select report type:
   - **Sales Report** - Daily, weekly, monthly
   - **Inventory Report** - Stock levels and movements
   - **Till Report** - Daily till reconciliation
   - **Top Products** - Best selling items
3. Apply filters (date range, category, etc.)
4. View or export report

---

### POS Sales Staff Guide

#### Processing a Sale

**Step 1: Start Transaction**
- Open POS section
- Ensure till session is active

**Step 2: Add Items**
- Use barcode scanner OR
- Search product by name OR
- Browse and click product

**Step 3: Review Cart**
- Verify quantities
- Check prices
- Review subtotal and tax

**Step 4: Collect Payment**
- Card: Select payment method and amount
- Cash: Collect exact amount or give change
- Transfer: Get reference number

**Step 5: Complete Sale**
- Click "Complete Sale"
- Print receipt
- Thank customer

**Tips for Efficiency:**
- Use barcode scanner for fast scanning
- Memorize frequently purchased items
- Handle cash carefully
- Always print receipt
- Verify payment before completion

#### Common Tasks

**Change Quantity**
- Click quantity field in cart
- Enter new amount
- Press Enter

**Remove Item**
- Click X button on cart item
- Confirm removal

**Apply Discount**
- Admin approval required
- Request manager assistance

**Process Refund**
- Use Returns section
- Requires manager PIN
- Select items and quantities

---

### Settings & Configuration

#### User Management

1. Go to **Settings** → **Users**
2. **Add User**:
   - Enter first name, last name
   - Create email
   - Set role (Sales, Administration, Super Administration)
   - System generates temporary password
   - User can change password on first login

3. **Edit User**:
   - Modify details
   - Change role
   - Reset password if needed

4. **Deactivate User**:
   - Select user
   - Click Deactivate
   - User cannot log in

#### Payment Gateway Configuration

1. Go to **Card Machine** → **Gateways**
2. **Add New Gateway**:
   - Select provider (Payfast, Capitec, Nedbank, FNB, ABSA)
   - Enter merchant credentials
   - Set test mode for testing
   - Click "Test Connection"
   - Enable when verified

3. **Configuration Details**:
   - Keep API keys secure
   - Use test mode initially
   - Test with provided test cards
   - Deploy to production when ready

#### Card Machine Settings

1. Go to **Card Machine** → **Machines**
2. **Add Machine**:
   - Device name
   - Serial number
   - Device type
   - Port configuration
   - IP address (if network device)
   - Click Add

3. **Monitor Health**:
   - Check connection status
   - View last heartbeat
   - Check signal strength
   - Address errors immediately

---

## API Documentation

### Authentication

All API endpoints (except login) require authentication via session.

#### Login Endpoint

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "role": "Administration"
  }
}
```

### PIN Management

#### Generate Daily PIN

```http
POST /api/auth/generate-pin
Content-Type: application/json

{
  "userId": "user-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "pin": "123456",
  "expiresAt": "2026-04-25T00:00:00Z",
  "message": "New PIN generated successfully"
}
```

#### Verify PIN

```http
POST /api/auth/verify-pin
Content-Type: application/json

{
  "pin": "123456"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "Administration"
  }
}
```

### Products API

#### Get All Products

```http
GET /api/products
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Product Name",
    "category": "Category",
    "price": 99.99,
    "stock": 50,
    "lowStockThreshold": 10,
    "imageUrl": "url",
    "barcode": "123456789"
  }
]
```

#### Create Product

```http
POST /api/products
Content-Type: application/json

{
  "name": "New Product",
  "category": "Electronics",
  "price": 299.99,
  "stock": 100,
  "lowStockThreshold": 20,
  "description": "Product description",
  "barcode": "123456789"
}
```

#### Update Product

```http
PUT /api/products/[id]
Content-Type: application/json

{
  "name": "Updated Name",
  "price": 349.99,
  "stock": 80
}
```

#### Delete Product

```http
DELETE /api/products/[id]
```

### Sales API

#### Create Sale

```http
POST /api/sales
Content-Type: application/json

{
  "customerName": "John Customer",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "price": 99.99
    }
  ],
  "paymentMethod": "Card",
  "total": 199.98,
  "salesperson": "Jane Smith"
}
```

#### Get Sales

```http
GET /api/sales?limit=50&offset=0
```

#### Get Single Sale

```http
GET /api/sales/[id]
```

#### Update Sale Status

```http
PUT /api/sales/[id]
Content-Type: application/json

{
  "status": "Voided"
}
```

### Till Management API

#### Get Till Sessions

```http
GET /api/till-management
```

#### Start Till Session

```http
POST /api/till-management
Content-Type: application/json

{
  "userId": "uuid",
  "openingBalance": 5000.00
}
```

#### End Till Session

```http
PUT /api/till-management/[id]
Content-Type: application/json

{
  "countedCash": 5500.00,
  "status": "Closed"
}
```

### Card Machine API

#### Get Machines

```http
GET /api/card-machine?action=machines
```

#### Add Card Machine

```http
POST /api/card-machine
Content-Type: application/json

{
  "type": "machine",
  "deviceName": "Terminal 1",
  "serialNumber": "SN123456",
  "deviceType": "Verifone",
  "port": "COM1",
  "baudRate": 9600
}
```

#### Get Gateways

```http
GET /api/card-machine?action=gateways
```

#### Add Payment Gateway

```http
POST /api/card-machine
Content-Type: application/json

{
  "type": "gateway",
  "merchantName": "Store Name",
  "merchantId": "MERCHANT123",
  "apiKey": "your_api_key",
  "apiSecret": "your_api_secret",
  "gatewayType": "Payfast",
  "testMode": true
}
```

---

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  firstName VARCHAR(255) NOT NULL,
  lastName VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('Administration', 'Sales', 'Super Administration'),
  pin VARCHAR(6),
  pin_expires_at DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Products Table

```sql
CREATE TABLE products (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INT NOT NULL,
  lowStockThreshold INT NOT NULL,
  description TEXT,
  imageUrl VARCHAR(500),
  barcode VARCHAR(100),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Sales Table

```sql
CREATE TABLE sales (
  id VARCHAR(36) PRIMARY KEY,
  date DATETIME NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  customerName VARCHAR(255),
  userId VARCHAR(36) NOT NULL,
  paymentMethod ENUM('Card', 'Cash', 'Transfer'),
  salesperson VARCHAR(255) NOT NULL,
  status ENUM('Completed', 'Voided', 'Returned', 'Partially Returned'),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### Till Sessions Table

```sql
CREATE TABLE till_sessions (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  startDate DATETIME NOT NULL,
  openingBalance DECIMAL(10, 2) NOT NULL,
  endDate DATETIME,
  countedCash DECIMAL(10, 2),
  status ENUM('Active', 'Closed'),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### Card Machine Configuration

```sql
CREATE TABLE card_machine_config (
  id VARCHAR(36) PRIMARY KEY,
  deviceName VARCHAR(255) NOT NULL,
  serialNumber VARCHAR(100),
  deviceType ENUM('Verifone', 'Ingenico', 'PAX', 'Square', 'Other'),
  port VARCHAR(20),
  baudRate INT DEFAULT 9600,
  ipAddress VARCHAR(20),
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE merchant_gateway_config (
  id VARCHAR(36) PRIMARY KEY,
  merchantName VARCHAR(255) NOT NULL,
  merchantId VARCHAR(100) UNIQUE NOT NULL,
  apiKey VARCHAR(255) NOT NULL,
  apiSecret VARCHAR(255) NOT NULL,
  gatewayType ENUM('Payfast', 'Capitec', 'Nedbank', 'FNB', 'ABSA'),
  testMode BOOLEAN DEFAULT true,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Security

### Best Practices

1. **Password Security**
   - Use strong passwords (12+ characters)
   - Change passwords regularly
   - Never share credentials
   - Use unique passwords for each system

2. **PIN Management**
   - PIN changes every 24 hours
   - Only administrators have PIN access
   - PIN required for sensitive operations
   - PIN never displayed in logs

3. **Data Protection**
   - All data encrypted in transit (HTTPS)
   - Database uses strong encryption
   - Regular backups performed
   - Access logs maintained

4. **Session Management**
   - Sessions expire after inactivity
   - Automatic logout after 30 minutes
   - Each user gets unique session ID
   - Session stored securely

5. **Payment Card Security**
   - PCI DSS compliant
   - No card numbers stored in database
   - Card data handled by gateway
   - Encrypted transaction logs

### Role-Based Access Control

| Function | Sales | Admin | Super Admin |
|----------|-------|-------|------------|
| Process Sales | ✅ | ✅ | ✅ |
| Issue Refunds | ❌ | ✅ | ✅ |
| Manage Products | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ✅ |
| Generate PIN | ❌ | ✅ | ✅ |
| Configure Gateways | ❌ | ❌ | ✅ |
| View All Reports | ❌ | ✅ | ✅ |

---

## Troubleshooting

### Common Issues

**Issue: Cannot Login**
- Verify email address spelling
- Reset password if forgotten
- Check CAPS LOCK
- Clear browser cookies

**Issue: Products Not Showing**
- Verify products were added
- Check database connection
- Refresh page
- Check user permissions

**Issue: Payment Failed**
- Verify gateway configuration
- Check test mode setting
- Verify API credentials
- Check network connectivity

**Issue: Till Not Closing**
- Ensure all sales recorded
- Check discrepancies
- Verify cash count accuracy
- Contact support if variance too large

**Issue: Slow Performance**
- Check database connection
- Clear browser cache
- Verify network speed
- Check server resources

### Getting Help

1. **Check Documentation** - Most answers in this guide
2. **Review Logs** - Check browser console for errors
3. **Restart Application** - Refresh page and retry
4. **Contact Support** - Email support team

---

## Support

### Support Channels

- **Email**: support@rhulanituckshop.co.za
- **Phone**: +27 21 555 0000
- **Hours**: Monday-Friday, 8am-5pm SAST
- **Response Time**: 2 hours for urgent issues

### Reporting Bugs

Include:
1. Detailed description of issue
2. Steps to reproduce
3. Screenshots if applicable
4. Browser and version
5. Current system state

### Feature Requests

1. Describe desired feature
2. Explain business value
3. Provide use cases
4. Suggest priority level

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-24 | Initial release with complete feature set |

---

**Last Updated:** April 24, 2026  
**Next Review:** July 24, 2026
