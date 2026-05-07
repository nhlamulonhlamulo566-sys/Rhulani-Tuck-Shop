-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  firstName VARCHAR(255) NOT NULL,
  lastName VARCHAR(255) NOT NULL,
  workNumber VARCHAR(8) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('Administration', 'Sales', 'Super Administration') NOT NULL,
  pin VARCHAR(6),
  pin_expires_at DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_workNumber (workNumber),
  INDEX idx_email (email)
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INT NOT NULL,
  lowStockThreshold INT NOT NULL,
  description TEXT,
  imageUrl VARCHAR(500),
  imageHint VARCHAR(255),
  barcode VARCHAR(100),
  barcodePack VARCHAR(100),
  packSize INT,
  barcodeCase VARCHAR(100),
  caseSize INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_name (name)
);

-- Sales Table
CREATE TABLE IF NOT EXISTS sales (
  id VARCHAR(36) PRIMARY KEY,
  date DATETIME NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  customerName VARCHAR(255),
  userId VARCHAR(36) NOT NULL,
  paymentMethod ENUM('Card', 'Cash', 'Transfer'),
  subtotal DECIMAL(10, 2),
  tax DECIMAL(10, 2),
  amountPaid DECIMAL(10, 2),
  change DECIMAL(10, 2),
  salesperson VARCHAR(255) NOT NULL,
  status ENUM('Completed', 'Voided', 'Returned', 'Partially Returned') NOT NULL,
  transactionType ENUM('sale', 'withdrawal', 'voucher'),
  withdrawalReason TEXT,
  cardTransactionId VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  INDEX idx_date (date),
  INDEX idx_userId (userId),
  INDEX idx_status (status)
);

-- Sale Items Table
CREATE TABLE IF NOT EXISTS sale_items (
  id VARCHAR(36) PRIMARY KEY,
  saleId VARCHAR(36) NOT NULL,
  productId VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  returnedQuantity INT DEFAULT 0,
  FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES products(id),
  INDEX idx_saleId (saleId),
  INDEX idx_productId (productId)
);

-- Returns Table
CREATE TABLE IF NOT EXISTS returns (
  id VARCHAR(36) PRIMARY KEY,
  saleId VARCHAR(36) NOT NULL,
  date DATETIME NOT NULL,
  reason VARCHAR(255),
  status VARCHAR(50),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (saleId) REFERENCES sales(id),
  INDEX idx_saleId (saleId)
);

-- Stock Count Table
CREATE TABLE IF NOT EXISTS stock_counts (
  id VARCHAR(36) PRIMARY KEY,
  productId VARCHAR(36) NOT NULL,
  countedQuantity INT NOT NULL,
  systemQuantity INT NOT NULL,
  variance INT,
  countDate DATETIME NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id),
  INDEX idx_productId (productId),
  INDEX idx_countDate (countDate)
);

-- Till Management Table
CREATE TABLE IF NOT EXISTS till_management (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  openingBalance DECIMAL(10, 2) NOT NULL,
  closingBalance DECIMAL(10, 2),
  openedAt DATETIME NOT NULL,
  closedAt DATETIME,
  userName VARCHAR(255),
  closedBy VARCHAR(255),
  status ENUM('Active', 'Closed') DEFAULT 'Active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  INDEX idx_userId (userId),
  INDEX idx_openedAt (openedAt),
  INDEX idx_status (status),
  INDEX idx_closedAt (closedAt)
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36),
  action VARCHAR(255) NOT NULL,
  details TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  INDEX idx_userId (userId),
  INDEX idx_createdAt (createdAt)
);
