import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'rhulanituckshop',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function columnExists(connection: mysql.PoolConnection, table: string, column: string): Promise<boolean> {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [process.env.DATABASE_NAME || 'rhulanituckshop', table, column]
  ) as any;
  return Number(rows[0].count) > 0;
}

async function initializeDatabase() {
  const connection = await pool.getConnection();

  try {
    console.log('🚀 Starting database initialization...');

    // Create tables
    console.log('📋 Creating tables...');
    await connection.query(`
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
    `);

    if (!(await columnExists(connection, 'users', 'workNumber'))) {
      await connection.query(`ALTER TABLE users ADD COLUMN workNumber VARCHAR(8) UNIQUE NULL`);
    }
    const [missingRows] = await connection.query(`SELECT id FROM users WHERE workNumber IS NULL OR workNumber = ''`) as any;
    const [existingRows] = await connection.query(`SELECT workNumber FROM users WHERE workNumber IS NOT NULL AND workNumber != ''`) as any;
    const usedWorkNumbers = new Set(existingRows.map((row: any) => row.workNumber));
    let nextNumber = 10000000;

    for (const row of missingRows) {
      let candidate = String(nextNumber).padStart(8, '0');
      while (usedWorkNumbers.has(candidate)) {
        nextNumber += 1;
        candidate = String(nextNumber).padStart(8, '0');
      }
      usedWorkNumbers.add(candidate);
      await connection.query(`UPDATE users SET workNumber = ? WHERE id = ?`, [candidate, row.id]);
      nextNumber += 1;
    }

    await connection.query(`ALTER TABLE users MODIFY workNumber VARCHAR(8) UNIQUE NOT NULL`);

    await connection.query(`
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
    `);

    await connection.query(`
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
    `);

    await connection.query(`
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
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS till_sessions (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        startDate DATETIME NOT NULL,
        openingBalance DECIMAL(10, 2) NOT NULL,
        endDate DATETIME,
        expectedCash DECIMAL(10, 2),
        countedCash DECIMAL(10, 2),
        difference DECIMAL(10, 2),
        status ENUM('Active', 'Closed') NOT NULL,
        userName VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id),
        INDEX idx_userId (userId),
        INDEX idx_status (status)
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS card_machine_config (
        id VARCHAR(36) PRIMARY KEY,
        deviceName VARCHAR(255) NOT NULL,
        serialNumber VARCHAR(100),
        deviceType ENUM('Verifone', 'Ingenico', 'PAX', 'Square', 'Other') NOT NULL,
        port VARCHAR(20),
        baudRate INT DEFAULT 9600,
        ipAddress VARCHAR(20),
        port_number INT,
        isActive BOOLEAN DEFAULT true,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS merchant_gateway_config (
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
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS card_machine_health (
        id VARCHAR(36) PRIMARY KEY,
        machineId VARCHAR(36) NOT NULL,
        deviceName VARCHAR(255),
        serialNumber VARCHAR(100),
        deviceType VARCHAR(100),
        isActive BOOLEAN,
        connectionStatus ENUM('Connected', 'Disconnected', 'Error') NOT NULL,
        signalStrength INT,
        lastHeartbeat DATETIME,
        errorMessage TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (machineId) REFERENCES card_machine_config(id)
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS card_transactions_log (
        id VARCHAR(36) PRIMARY KEY,
        machineId VARCHAR(36),
        merchantId VARCHAR(100),
        transactionId VARCHAR(255),
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'ZAR',
        cardLastFour VARCHAR(4),
        status ENUM('Success', 'Failed', 'Pending') NOT NULL,
        errorMessage TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_createdAt (createdAt)
      );
    `);

    console.log('✅ Tables created successfully');

    // Insert test data
    console.log('📝 Inserting test data...');

    // Create users
    const superAdminId = uuidv4();
    const adminId = uuidv4();
    const salesId = uuidv4();

    await connection.query(
      `INSERT INTO users (id, firstName, lastName, workNumber, email, password, role) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [superAdminId, 'Super', 'Admin', '12345678', 'super@rhulanituckshop.co.za', 'Password1', 'Super Administration']
    );

    await connection.query(
      `INSERT INTO users (id, firstName, lastName, workNumber, email, password, role) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminId, 'Jane', 'Manager', '12345679', 'admin@rhulanituckshop.co.za', 'password123', 'Administration']
    );

    await connection.query(
      `INSERT INTO users (id, firstName, lastName, workNumber, email, password, role) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [salesId, 'John', 'Cashier', '12345680', 'sales@rhulanituckshop.co.za', 'password123', 'Sales']
    );

    console.log('👥 Users created (3)');

    // Create test products
    const products = [
      { name: 'Coca Cola 330ml', category: 'Beverages', price: 12.99, stock: 100, barcode: '6009107000028' },
      { name: 'Fanta Orange 330ml', category: 'Beverages', price: 11.99, stock: 80, barcode: '6009107000035' },
      { name: 'Sprite 330ml', category: 'Beverages', price: 11.99, stock: 75, barcode: '6009107000042' },
      { name: 'Bread 600g', category: 'Bakery', price: 18.99, stock: 50, barcode: '6001073901234' },
      { name: 'Milk 1L', category: 'Dairy', price: 22.99, stock: 45, barcode: '6001234567890' },
      { name: 'Yoghurt 500g', category: 'Dairy', price: 19.99, stock: 40, barcode: '6001234567891' },
      { name: 'Cheese 200g', category: 'Dairy', price: 34.99, stock: 30, barcode: '6001234567892' },
      { name: 'Eggs Dozen', category: 'Dairy', price: 29.99, stock: 60, barcode: '6001234567893' },
      { name: 'Chips 45g', category: 'Snacks', price: 8.99, stock: 200, barcode: '6008000124157' },
      { name: 'Chocolate Bar', category: 'Confectionery', price: 12.99, stock: 150, barcode: '5010477001000' },
    ];

    for (const product of products) {
      const productId = uuidv4();
      await connection.query(
        `INSERT INTO products (id, name, category, price, stock, lowStockThreshold, description, barcode) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [productId, product.name, product.category, product.price, product.stock, 20, `${product.name} - Test Product`, product.barcode]
      );
    }

    console.log('🛒 Products created (10)');

    // Create test payment gateways
    const gateways = [
      { name: 'Payfast', type: 'Payfast' },
      { name: 'Capitec', type: 'Capitec' },
      { name: 'Nedbank', type: 'Nedbank' },
      { name: 'FNB', type: 'FNB' },
      { name: 'ABSA', type: 'ABSA' },
    ];

    for (const gateway of gateways) {
      const gatewayId = uuidv4();
      await connection.query(
        `INSERT INTO merchant_gateway_config (id, merchantName, merchantId, apiKey, apiSecret, gatewayType, testMode, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          gatewayId,
          `Rhulani ${gateway.name}`,
          `TEST_${gateway.type.toUpperCase()}`,
          'test_api_key_' + gatewayId.substring(0, 8),
          'test_api_secret_' + gatewayId.substring(0, 8),
          gateway.type,
          true,
          true
        ]
      );
    }

    console.log('💳 Payment gateways created (5)');

    // Create test card machine
    const machineId = uuidv4();
    await connection.query(
      `INSERT INTO card_machine_config (id, deviceName, serialNumber, deviceType, port, baudRate, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [machineId, 'Terminal 1', 'SN000001', 'Verifone', 'COM1', 9600, true]
    );

    console.log('🖥️ Card machines created (1)');

    console.log('\n✨ Database initialization completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   ✅ 8 tables created');
    console.log('   ✅ 3 test users created');
    console.log('   ✅ 10 test products added');
    console.log('   ✅ 5 payment gateways configured');
    console.log('   ✅ 1 card machine configured\n');
    console.log('🔐 Test Credentials:');
    console.log('   Super Admin: super@rhulanituckshop.co.za / password123');
    console.log('   Admin: admin@rhulanituckshop.co.za / password123');
    console.log('   Sales: sales@rhulanituckshop.co.za / password123\n');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await connection.release();
    await pool.end();
  }
}

initializeDatabase();
