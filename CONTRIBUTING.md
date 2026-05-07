# Contributing to Rhulani Tuck Shop POS

We're excited that you want to contribute to the Rhulani Tuck Shop POS system! This document provides guidelines and instructions for contributing.

---

## Code of Conduct

Be respectful, inclusive, and professional. We're building a community tool for retailers.

---

## How to Contribute

### 1. Report Bugs

Found a bug? Please create an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Your environment (OS, Node version, etc.)

### 2. Suggest Features

Have a feature idea? Open an issue with:
- Clear description of the feature
- Use case and benefits
- Proposed implementation (optional)
- Any mockups or examples

### 3. Submit Code Changes

Follow these steps:

#### A. Fork & Clone
```bash
# Fork the repository on GitHub
# Clone your fork locally
git clone https://github.com/your-username/rhulani-pos.git
cd rhulani-pos
git remote add upstream https://github.com/original/rhulani-pos.git
```

#### B. Create Feature Branch
```bash
# Sync with upstream
git fetch upstream
git checkout -b feature/your-feature-name upstream/main
```

#### C. Make Changes
```bash
# Install dependencies
npm install

# Make your changes
# Ensure code quality
npm run lint
npm run type-check

# Run tests
npm test

# Build to verify
npm run build
```

#### D. Commit Changes
```bash
# Follow conventional commits format:
# feat: add new feature
# fix: fix bug
# docs: documentation changes
# test: add/update tests
# refactor: code refactoring
# style: formatting changes
# chore: maintenance tasks

git add .
git commit -m "feat: describe your changes clearly"
```

#### E. Push & Create Pull Request
```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear title and description
- Reference to related issues
- Screenshots (if UI changes)
- Checklist of what you've done

---

## Development Setup

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- Git

### Initial Setup
```bash
# Clone and install
git clone <repo>
cd rhulani-pos
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your database credentials

# Initialize database
npm run db:init

# Start development
npm run dev
```

### Development Commands
```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run lint          # Run ESLint
npm run type-check    # TypeScript checking
npm test              # Run tests
npm run test:watch    # Tests in watch mode
npm run db:init       # Initialize database
```

---

## Coding Standards

### TypeScript
- Use strict mode: `"strict": true` in tsconfig.json
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Add JSDoc comments for public APIs

```typescript
/**
 * Processes a sale transaction
 * @param items - Array of sale items
 * @param total - Total amount
 * @returns Promise with sale ID
 */
export async function processSale(
  items: SaleItem[],
  total: number
): Promise<{ saleId: string }> {
  // Implementation
}
```

### React Components
- Use functional components with hooks
- Keep components small and focused
- Use descriptive prop names
- Add propTypes or TypeScript types

```typescript
interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <div>
      {/* Implementation */}
    </div>
  )
}
```

### Database
- Use parameterized queries (never string concatenation)
- Add proper indexes for frequently queried columns
- Document schema changes in CHANGELOG.md

```typescript
// ✅ Good
const result = await query(
  'SELECT * FROM users WHERE id = ?',
  [userId]
);

// ❌ Bad
const result = await query(
  `SELECT * FROM users WHERE id = '${userId}'`
);
```

### Testing
- Aim for 80%+ code coverage
- Test happy path and edge cases
- Mock external services
- Use descriptive test names

```typescript
describe('ProductCard', () => {
  it('should add product to cart when button clicked', () => {
    // Test implementation
  });
});
```

### Documentation
- Write clear, concise documentation
- Include code examples
- Update docs when changing behavior
- Keep README up to date

---

## Pull Request Process

1. **Ensure Tests Pass**
   ```bash
   npm test
   npm run build
   ```

2. **Verify Code Quality**
   ```bash
   npm run lint
   npm run type-check
   ```

3. **Update Documentation**
   - Update README if adding features
   - Update CHANGELOG.md with your changes
   - Add comments for complex logic

4. **PR Checklist**
   - [ ] Tests added/updated
   - [ ] Documentation updated
   - [ ] No breaking changes (or documented)
   - [ ] Code follows standards
   - [ ] Builds successfully

5. **Review Process**
   - At least 1 approval required
   - All CI checks must pass
   - Code review feedback addressed
   - Squash commits before merge

---

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation
- **test**: Tests
- **refactor**: Code refactoring
- **style**: Formatting
- **chore**: Maintenance
- **perf**: Performance improvement
- **ci**: CI/CD changes

### Examples
```
feat(products): add bulk import functionality
fix(auth): resolve PIN validation regex bug
docs(api): add payment gateway examples
test(sales): increase coverage to 85%
refactor(db): optimize query performance
```

---

## Testing Requirements

### Unit Tests
- Test individual functions and components
- Mock external dependencies
- Aim for 80%+ coverage

### Integration Tests
- Test feature workflows
- Test database interactions
- Test API endpoints

### E2E Tests
- Test complete user journeys
- Verify critical paths

### Coverage Targets
```
Statements: 80%+
Branches: 75%+
Functions: 80%+
Lines: 80%+
```

---

## Security Considerations

### When Contributing
- Never commit secrets (API keys, passwords)
- Don't create security vulnerabilities
- Use parameterized queries for database
- Sanitize user inputs
- Follow OWASP guidelines

### Security Best Practices
- Use environment variables for config
- Enable TypeScript strict mode
- Run `npm audit` before submitting
- Test with security in mind

### Reporting Security Issues
**Do not** open public issues for security vulnerabilities.

Instead, email: **security@rhulanituckshop.co.za**

Include:
- Description of vulnerability
- Steps to reproduce
- Impact assessment
- Proposed fix (optional)

---

## Performance Guidelines

### Frontend
- Keep component bundle size minimal
- Use lazy loading for routes
- Memoize expensive components
- Optimize images

### Database
- Add indexes for frequent queries
- Use pagination for large datasets
- Avoid N+1 queries
- Cache when appropriate

### API
- Implement caching headers
- Use compression (gzip)
- Paginate responses
- Limit response size

---

## File Organization

```
src/
├── app/                    # Next.js routes
├── components/             # React components
│   ├── ui/                # Reusable UI
│   ├── pos/               # POS-specific
│   └── dashboard/         # Dashboard
├── hooks/                 # Custom hooks
├── lib/                   # Utilities
│   ├── db.ts             # Database
│   ├── types.ts          # Types
│   └── utils.ts          # Helpers
└── ai/                    # AI integration

tests/
├── unit/                  # Unit tests
├── integration/           # Integration tests
└── fixtures/              # Test data

docs/                      # Documentation
├── api.md                # API docs
├── db-schema.sql         # Database schema
└── deployment.md         # Deployment guide
```

---

## Questions?

- Check [COMPLETE_DOCUMENTATION.md](docs/COMPLETE_DOCUMENTATION.md)
- Open a GitHub Discussion
- Email: tech@rhulanituckshop.co.za
- Contact: support@rhulanituckshop.co.za

---

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- CHANGELOG.md releases
- Project website
- Annual appreciation

---

## License

By contributing, you agree your code will be licensed under MIT License. See [LICENSE](LICENSE) file.

---

**Thank you for contributing to Rhulani Tuck Shop POS!** 🎉

Your contributions help make this system better for retailers across South Africa.
