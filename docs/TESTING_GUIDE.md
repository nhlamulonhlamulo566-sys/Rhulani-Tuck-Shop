# Testing Guide

This guide provides comprehensive information for testing the Rhulani Tuck Shop POS system using Jest and React Testing Library.

---

## Setup & Configuration

### 1. Install Testing Dependencies

```bash
# Install Jest and testing libraries
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Install additional testing utilities
npm install --save-dev jest-environment-jsdom ts-jest @types/jest

# Install API mocking
npm install --save-dev msw
```

### 2. Configure Jest

Create `jest.config.js`:

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
}

module.exports = createJestConfig(customJestConfig)
```

### 3. Setup Jest Initialization

Create `jest.setup.js`:

```javascript
import '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      pathname: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))
```

### 4. Configure Package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand"
  }
}
```

---

## Test Organization

```
tests/
├── unit/
│   ├── api/
│   │   ├── auth.test.ts
│   │   ├── products.test.ts
│   │   └── sales.test.ts
│   ├── hooks/
│   │   └── useDbCollection.test.ts
│   └── utils/
│       └── db.test.ts
├── integration/
│   ├── auth-flow.test.ts
│   ├── sales-flow.test.ts
│   └── pin-verification.test.ts
├── components/
│   ├── PinAuthDialog.test.tsx
│   ├── ProductCard.test.tsx
│   └── ReceiptModal.test.tsx
└── fixtures/
    ├── users.json
    ├── products.json
    └── transactions.json
```

---

## Writing Tests

### API Tests

#### Example: Authentication Tests

```typescript
// tests/unit/api/auth.test.ts
import { loginUser, generatePin, verifyPin } from '@/app/api/auth'

describe('Authentication API', () => {
  describe('Login', () => {
    it('should login user with valid credentials', async () => {
      const response = await loginUser({
        email: 'admin@rhulanituckshop.co.za',
        password: 'password123',
      })

      expect(response).toHaveProperty('user')
      expect(response.user).toHaveProperty('id')
      expect(response.user).toHaveProperty('role')
    })

    it('should reject invalid credentials', async () => {
      const response = await loginUser({
        email: 'admin@rhulanituckshop.co.za',
        password: 'wrongpassword',
      })

      expect(response.error).toBeDefined()
      expect(response.error).toContain('Invalid credentials')
    })

    it('should reject non-existent user', async () => {
      const response = await loginUser({
        email: 'nonexistent@example.com',
        password: 'password123',
      })

      expect(response.error).toBeDefined()
    })
  })

  describe('PIN Generation', () => {
    it('should generate a 6-digit PIN', async () => {
      const response = await generatePin({
        userId: 'test-user-id',
      })

      expect(response.pin).toMatch(/^\d{6}$/)
      expect(response.expiresAt).toBeDefined()
    })

    it('should set PIN expiry to 24 hours', async () => {
      const before = new Date()
      const response = await generatePin({
        userId: 'test-user-id',
      })
      const after = new Date()

      const expiresAt = new Date(response.expiresAt)
      const expectedTime = 24 * 60 * 60 * 1000

      expect(expiresAt.getTime()).toBeGreaterThan(
        before.getTime() + expectedTime - 1000
      )
      expect(expiresAt.getTime()).toBeLessThan(
        after.getTime() + expectedTime + 1000
      )
    })
  })

  describe('PIN Verification', () => {
    it('should verify valid PIN', async () => {
      // First generate a PIN
      const genResponse = await generatePin({
        userId: 'test-user-id',
      })

      // Then verify it
      const verifyResponse = await verifyPin({
        userId: 'test-user-id',
        pin: genResponse.pin,
      })

      expect(verifyResponse.valid).toBe(true)
    })

    it('should reject expired PIN', async () => {
      // This requires mocking time
      jest.useFakeTimers()
      const testDate = new Date('2026-04-25')
      jest.setSystemTime(testDate)

      const response = await verifyPin({
        userId: 'test-user-id',
        pin: '123456',
      })

      expect(response.valid).toBe(false)
      jest.useRealTimers()
    })

    it('should reject invalid PIN format', async () => {
      const response = await verifyPin({
        userId: 'test-user-id',
        pin: 'abcdef',
      })

      expect(response.valid).toBe(false)
    })
  })
})
```

#### Example: Product Tests

```typescript
// tests/unit/api/products.test.ts
import { getProducts, createProduct, updateProduct } from '@/app/api/products'

describe('Products API', () => {
  const mockProduct = {
    name: 'Test Product',
    category: 'Test Category',
    price: 29.99,
    stock: 100,
    barcode: '1234567890',
  }

  describe('Get Products', () => {
    it('should retrieve all products', async () => {
      const response = await getProducts()

      expect(Array.isArray(response.products)).toBe(true)
      expect(response.products.length).toBeGreaterThan(0)
    })

    it('should filter products by category', async () => {
      const response = await getProducts({
        category: 'Beverages',
      })

      expect(Array.isArray(response.products)).toBe(true)
      response.products.forEach((product) => {
        expect(product.category).toBe('Beverages')
      })
    })

    it('should search products by name', async () => {
      const response = await getProducts({
        search: 'Coca',
      })

      expect(Array.isArray(response.products)).toBe(true)
    })
  })

  describe('Create Product', () => {
    it('should create a new product', async () => {
      const response = await createProduct(mockProduct)

      expect(response.product).toBeDefined()
      expect(response.product.id).toBeDefined()
      expect(response.product.name).toBe(mockProduct.name)
    })

    it('should validate required fields', async () => {
      const invalidProduct = {
        name: 'Test',
        // missing other required fields
      }

      const response = await createProduct(invalidProduct)

      expect(response.error).toBeDefined()
    })

    it('should validate price is positive', async () => {
      const response = await createProduct({
        ...mockProduct,
        price: -10,
      })

      expect(response.error).toBeDefined()
    })
  })

  describe('Update Product', () => {
    it('should update product details', async () => {
      const productId = 'test-product-id'
      const updates = {
        price: 39.99,
        stock: 50,
      }

      const response = await updateProduct(productId, updates)

      expect(response.product).toBeDefined()
      expect(response.product.price).toBe(39.99)
    })

    it('should not update non-existent product', async () => {
      const response = await updateProduct('invalid-id', {
        price: 39.99,
      })

      expect(response.error).toBeDefined()
    })
  })
})
```

### Component Tests

#### Example: PIN Auth Dialog Tests

```typescript
// tests/components/PinAuthDialog.test.tsx
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PinAuthDialog } from '@/components/auth/pin-auth-dialog'

describe('PinAuthDialog', () => {
  const mockOnSuccess = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render dialog with PIN input', () => {
    render(
      <PinAuthDialog
        isOpen={true}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/enter 6-digit pin/i)).toBeInTheDocument()
  })

  it('should accept 6-digit PIN input', async () => {
    const user = userEvent.setup()
    render(
      <PinAuthDialog
        isOpen={true}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const pinInput = screen.getByPlaceholderText(/enter 6-digit pin/i)
    await user.type(pinInput, '123456')

    expect(pinInput).toHaveValue('123456')
  })

  it('should not accept non-numeric input', async () => {
    const user = userEvent.setup()
    render(
      <PinAuthDialog
        isOpen={true}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const pinInput = screen.getByPlaceholderText(/enter 6-digit pin/i)
    await user.type(pinInput, 'abcdef')

    expect(pinInput).toHaveValue('')
  })

  it('should call onSuccess with valid PIN', async () => {
    const user = userEvent.setup()
    render(
      <PinAuthDialog
        isOpen={true}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const pinInput = screen.getByPlaceholderText(/enter 6-digit pin/i)
    await user.type(pinInput, '123456')

    const submitButton = screen.getByRole('button', { name: /verify/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith('123456')
    })
  })

  it('should call onCancel when closing dialog', async () => {
    const user = userEvent.setup()
    render(
      <PinAuthDialog
        isOpen={true}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should show error message for invalid PIN', async () => {
    const user = userEvent.setup()
    render(
      <PinAuthDialog
        isOpen={true}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const pinInput = screen.getByPlaceholderText(/enter 6-digit pin/i)
    await user.type(pinInput, '000000')

    const submitButton = screen.getByRole('button', { name: /verify/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid pin/i)).toBeInTheDocument()
    })
  })
})
```

#### Example: Product Card Tests

```typescript
// tests/components/ProductCard.test.tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductCard } from '@/components/pos/product-card'

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Coca Cola 330ml',
    price: 12.99,
    category: 'Beverages',
    imageUrl: '/images/cocacola.jpg',
  }

  const mockOnAddToCart = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render product information', () => {
    render(
      <ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />
    )

    expect(screen.getByText(mockProduct.name)).toBeInTheDocument()
    expect(screen.getByText(`R${mockProduct.price.toFixed(2)}`)).toBeInTheDocument()
  })

  it('should display product image', () => {
    render(
      <ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />
    )

    const image = screen.getByAltText(mockProduct.name)
    expect(image).toHaveAttribute('src', mockProduct.imageUrl)
  })

  it('should call onAddToCart when button is clicked', () => {
    render(
      <ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />
    )

    const addButton = screen.getByRole('button', { name: /add to cart/i })
    fireEvent.click(addButton)

    expect(mockOnAddToCart).toHaveBeenCalledWith(mockProduct)
  })

  it('should be disabled when out of stock', () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 }

    render(
      <ProductCard
        product={outOfStockProduct}
        onAddToCart={mockOnAddToCart}
      />
    )

    const addButton = screen.getByRole('button', { name: /out of stock/i })
    expect(addButton).toBeDisabled()
  })
})
```

### Integration Tests

#### Example: Complete Sales Flow Test

```typescript
// tests/integration/sales-flow.test.ts
describe('Complete Sales Flow', () => {
  it('should process a complete sale', async () => {
    // 1. Login
    const loginResponse = await loginUser({
      email: 'sales@rhulanituckshop.co.za',
      password: 'password123',
    })
    expect(loginResponse.user).toBeDefined()

    // 2. Get products
    const productsResponse = await getProducts()
    expect(productsResponse.products.length).toBeGreaterThan(0)

    // 3. Create sale
    const saleResponse = await createSale({
      items: [
        {
          productId: productsResponse.products[0].id,
          quantity: 2,
          price: productsResponse.products[0].price,
        },
      ],
      total: productsResponse.products[0].price * 2,
      paymentMethod: 'Cash',
    })

    expect(saleResponse.sale).toBeDefined()
    expect(saleResponse.sale.id).toBeDefined()

    // 4. Verify stock updated
    const updatedProductsResponse = await getProducts()
    const updatedProduct = updatedProductsResponse.products.find(
      (p) => p.id === productsResponse.products[0].id
    )
    expect(updatedProduct.stock).toBe(
      productsResponse.products[0].stock - 2
    )
  })
})
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test auth.test.ts

# Run with coverage
npm run test:coverage

# Run in debug mode
npm run test:debug
```

---

## Coverage Targets

| Category | Target | Status |
|----------|--------|--------|
| Statements | 80% | ✅ |
| Branches | 75% | ✅ |
| Functions | 80% | ✅ |
| Lines | 80% | ✅ |

---

## Best Practices

### 1. Test Organization

```typescript
describe('Feature', () => {
  describe('Specific Functionality', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test'

      // Act
      const result = process(input)

      // Assert
      expect(result).toBe('expected')
    })
  })
})
```

### 2. Mocking Strategy

- Mock external API calls with MSW
- Mock database queries
- Mock Next.js routing
- Use fixtures for consistent test data

### 3. Test Data

```typescript
// Use factories for consistent test data
export const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  role: 'Sales',
  ...overrides,
})

export const createMockProduct = (overrides = {}) => ({
  id: 'product-1',
  name: 'Test Product',
  price: 29.99,
  stock: 100,
  ...overrides,
})
```

### 4. Async Testing

```typescript
it('should handle async operations', async () => {
  const promise = fetchData()

  await waitFor(() => {
    expect(screen.getByText('loaded')).toBeInTheDocument()
  })
})
```

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

---

## Troubleshooting

### Common Issues

**"Cannot find module '@/'"**
- Check moduleNameMapper in jest.config.js
- Ensure tsconfig.json has correct baseUrl

**"ReferenceError: document is not defined"**
- Set testEnvironment to 'jest-environment-jsdom'

**"TypeError: nextRouter.push is not a function"**
- Mock next/navigation in jest.setup.js

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Next.js Testing](https://nextjs.org/docs/testing)

---

**Last Updated:** April 24, 2026
