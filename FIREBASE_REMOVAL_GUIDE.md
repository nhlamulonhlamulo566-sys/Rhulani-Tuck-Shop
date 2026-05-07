# Firebase to MySQL Migration - Component Update Guide

## Status: 🔄 IN PROGRESS

Firebase has been completely removed from the project. All Firebase files have been deleted and database connection now uses MySQL exclusively via API endpoints.

## What Was Removed

### Files Deleted
- ✅ `src/firebase/` directory (entire folder)
- ✅ All Firebase configuration files
- ✅ Firebase-admin and firebase npm packages

### Environment Variables Removed
- ✅ FIREBASE_ADMIN_SDK_CONFIG
- ✅ FIREBASE_CLIENT_EMAIL
- ✅ FIREBASE_PRIVATE_KEY
- ✅ FIREBASE_PROJECT_ID
- ✅ FIRESTORE_EMULATOR_HOST
- ✅ GOOGLE_APPLICATION_CREDENTIALS

### Code Updates
- ✅ `src/app/layout.tsx` - Removed FirebaseClientProvider
- ✅ `src/app/login/page.tsx` - Updated to use MySQL API
- ✅ `src/app/(dashboard)/layout.tsx` - Updated to use sessionStorage for auth
- ✅ `src/components/FirebaseErrorListener.tsx` - Converted to no-op
- ✅ `.env.local` - Contains only MySQL config now
- ✅ `package.json` - Firebase packages removed

## Components Needing Update

The following components still have Firebase imports and need to be updated:

### Pages
1. **`src/app/(dashboard)/card-transactions/page.tsx`**
   - Imports: useFirestore, useCollection, useUser, useMemoFirebase
   - Firestore: collection, query, where, orderBy
   - **Fix:** Use new `useCollection` hook from `@/hooks/use-db-collection`

2. **`src/app/(dashboard)/dashboard/page.tsx`**
   - Imports: useFirestore, useUser, useCollection, useMemoFirebase
   - Firestore: collection, query, where
   - **Fix:** Use new hooks and MySQL API

3. **`src/app/(dashboard)/pos/page.tsx`**
   - Imports: useFirestore, useCollection, useUser, useMemoFirebase, addDocumentNonBlocking
   - Firestore: collection, doc, writeBatch, query, where, limit
   - **Fix:** Replace batch operations with individual API calls

4. **`src/app/(dashboard)/cash-up/page.tsx`**
   - Imports: useFirestore, useCollection, useMemoFirebase
   - Firestore: collection, query
   - **Fix:** Use new collection hook

5. **`src/app/(dashboard)/reorder-hub/page.tsx`**
   - Imports: useFirestore, useCollection, useMemoFirebase
   - Firestore: collection, query, where
   - **Fix:** Use new collection hook

6. **`src/app/(dashboard)/till-management/page.tsx`**
   - Imports: useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking
   - **Fix:** Use new hooks and API endpoints

7. **`src/app/(dashboard)/sales/page.tsx`** (if exists)
   - **Fix:** Use sales API endpoints

8. **`src/app/(dashboard)/products/page.tsx`** (if exists)
   - **Fix:** Use products API endpoints

9. **`src/app/(dashboard)/returns/page.tsx`** (if exists)
   - **Fix:** Use returns API endpoints

10. **`src/app/(dashboard)/stock-count/page.tsx`** (if exists)
    - **Fix:** Use stock-counts API endpoints

### Components
1. **`src/components/auth/pin-auth-dialog.tsx`**
   - Imports: useFirestore, collection, query, where, getDocs
   - **Fix:** Create PIN verification API endpoint

2. **`src/components/dashboard/recent-sales.tsx`**
   - Imports: useFirestore, useCollection, useMemoFirebase
   - Firestore: collection, query, where, orderBy
   - **Fix:** Use sales collection hook with `/api/sales`

3. **`src/components/reports/top-selling-products.tsx`**
   - Imports: useFirestore, useCollection, useMemoFirebase
   - Firestore: collection, query, where
   - **Fix:** Query via API

4. **`src/components/products/products-table.tsx`**
   - Imports: useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking
   - Firestore: collection, doc
   - **Fix:** Use new product API endpoints

## Migration Pattern

### Old Firebase Pattern
```typescript
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

const firestore = useFirestore();
const productsRef = useMemo(() => {
  if (!firestore) return null;
  return query(
    collection(firestore, 'products'),
    where('category', '==', category)
  );
}, [firestore, category]);

const { data: products } = useCollection(productsRef);
```

### New MySQL Pattern
```typescript
import { useCollection } from '@/hooks/use-db-collection';

// Simple endpoint-based fetching
const { data: products } = useCollection('/api/products');

// With URL params if filtering is needed
const endpoint = `/api/products?category=${category}`;
const { data: products } = useCollection(endpoint);
```

## API Endpoints Available

All endpoints are ready to use:

- `GET/POST /api/users` - User management
- `GET/POST /api/products` - Product inventory
- `GET/POST /api/sales` - Sales transactions
- `GET/POST /api/returns` - Product returns
- `GET/POST /api/stock-counts` - Stock counts
- `GET/POST /api/till-management` - Till operations
- `GET/POST /api/audit-logs` - Audit trail
- `POST /api/auth/login` - Authentication
- `POST /api/init-db` - Database initialization

## Next Steps

1. **Update Components Gradually**
   - Start with simple collection-based components
   - Test each update before moving to next
   - Use new `useCollection` and `useDoc` hooks

2. **Create Missing API Endpoints**
   - PIN verification endpoint
   - Product search/filter endpoints
   - Custom report endpoints

3. **Update Form Submissions**
   - Replace Firestore create/update/delete with API POST/PUT/DELETE
   - Handle API errors appropriately
   - Show success/error toasts

4. **Test Authentication Flow**
   - Login flow (✅ already updated)
   - Session persistence
   - Logout and redirect

5. **Verify Data Flow**
   - Test dashboard loading data
   - Test POS operations
   - Test product management
   - Test sales recording

## Testing Checklist

After updating each component:
- [ ] No Firebase import errors
- [ ] Component loads without errors
- [ ] Data fetches from MySQL API
- [ ] User interactions work (create, update, delete)
- [ ] Error handling works
- [ ] Loading states display correctly
- [ ] No console errors

## Notes

- All user state is now in `sessionStorage` under key 'currentUser'
- API calls should include proper error handling
- Consider implementing JWT tokens for better security
- Database must be initialized: `POST /api/init-db`
- MySQL credentials in `.env.local`

---

**Last Updated:** April 24, 2026
**Database:** MySQL only (Firebase completely removed)
**Status:** Ready for component migration
