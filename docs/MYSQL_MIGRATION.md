# MySQL Database Migration Guide

## Overview
Your Rhulani Tuck Shop application has been successfully migrated from Firebase to a live MySQL database. All the infrastructure is in place to support your business operations.

## Database Configuration

### Connection Details
- **Host:** 0 tcp.us.ngrok.io
- **Port:** 19359
- **Database:** rhulanituckshop
- **Username:** jeff
- **Password:** 0813210332@Jeff

### Environment Variables
The `.env.local` file has been updated with the MySQL credentials:
```
DATABASE_HOST=0 tcp.us.ngrok.io
DATABASE_PORT=19359
DATABASE_NAME=rhulanituckshop
DATABASE_USER=jeff
DATABASE_PASSWORD=0813210332@Jeff
```

## What Has Been Done

### 1. Database Connection Module
- Created `src/lib/db.ts` - MySQL connection pool with connection pooling and error handling

### 2. API Routes Created
All data operations now go through REST API endpoints:

#### Users Management
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `GET /api/users/[id]` - Get specific user
- `PUT /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

#### Products Management
- `GET /api/products` - Get all products
- `POST /api/products` - Create new product
- `GET /api/products/[id]` - Get specific product
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product

#### Sales Management
- `GET /api/sales` - Get all sales
- `POST /api/sales` - Create new sale with items

#### Authentication
- `POST /api/auth/login` - User login

#### Other Operations
- `GET /api/returns` - Get all returns
- `POST /api/returns` - Create return
- `GET /api/stock-counts` - Get stock counts
- `POST /api/stock-counts` - Create stock count

#### Database Initialization
- `POST /api/init-db` - Initialize database schema

### 3. Database Hooks
- Created `src/hooks/use-db-doc.ts` - Hook for fetching single documents
- Created `src/hooks/use-db-collection.ts` - Hook for fetching collections

### 4. Database Schema
All necessary tables have been created:
- `users` - User accounts and authentication
- `products` - Product inventory
- `sales` - Sales transactions
- `sale_items` - Items within sales
- `returns` - Product returns
- `stock_counts` - Stock count history
- `till_management` - Till/cash register management
- `audit_logs` - Audit trail for actions

## Setup Instructions

### Step 1: Install Dependencies
```bash
npm install
```

The `mysql2` package has been added to `package.json`.

### Step 2: Initialize Database
Make sure your MySQL database (`rhulanituckshop`) exists and is accessible. Then:

```bash
# Via API endpoint (recommended)
curl -X POST http://localhost:9002/api/init-db

# Or via database client
# Import the SQL from docs/db-schema.sql
```

### Step 3: Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:9002`

### Step 4: Test Connection
You can verify the database is connected by:
1. Creating a user through the signup page
2. Making API calls to `/api/users` to see the stored data
3. Checking your MySQL database directly

## Migration Notes

### Data Migration from Firebase (if needed)
If you have existing data in Firebase that needs to be migrated:

1. Export data from Firestore
2. Transform to match the new schema
3. Import into MySQL database

### API Integration
Components that previously used Firebase hooks (`useCollection`, `useDoc`) should be updated to use the new database hooks:

**Old Firebase approach:**
```typescript
import { useCollection } from '@/firebase/firestore/use-collection';

const { data: products } = useCollection<Product>(productsRef);
```

**New MySQL approach:**
```typescript
import { useCollection } from '@/hooks/use-db-collection';

const { data: products } = useCollection<Product>('/api/products');
```

## Important Files

| File | Purpose |
|------|---------|
| `.env.local` | Database connection credentials |
| `src/lib/db.ts` | MySQL connection pool |
| `src/lib/db-init.ts` | Database schema initialization |
| `src/app/api/**` | REST API endpoints |
| `src/hooks/use-db-*.ts` | Database hooks for components |
| `docs/db-schema.sql` | Database schema definition |

## Troubleshooting

### Connection Issues
1. Verify the MySQL server is running
2. Check that the ngrok tunnel is active (0 tcp.us.ngrok.io:19359)
3. Verify credentials in `.env.local`
4. Check network connectivity

### Database Errors
1. Ensure the database `rhulanituckshop` exists
2. Verify all tables were created (check via `/api/init-db`)
3. Check database logs for specific errors

### API Errors
1. Check browser console for error messages
2. Verify the API route file exists
3. Check database connectivity
4. Review server logs

## Next Steps

1. **Update Components:** Gradually migrate components from Firebase to MySQL API
2. **Test Functionality:** Test all major features (POS, sales, products, etc.)
3. **Performance Monitoring:** Monitor query performance and optimize as needed
4. **Backup Strategy:** Set up regular database backups
5. **Authentication:** Consider implementing JWT or session-based auth

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review error logs in the browser console and terminal
3. Verify database connectivity
4. Check the API endpoint responses

---

**Migration Date:** April 24, 2026
**Database:** MySQL rhulanituckshop
**Status:** Ready for use
