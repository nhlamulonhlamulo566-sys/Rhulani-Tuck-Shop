const mysql = require('mysql2/promise');

async function initializeDatabase() {
  let connection = null;

  try {
    console.log('🔄 Connecting to database...');

    // Create connection
    connection = await mysql.createConnection({
      host: '0.tcp.sa.ngrok.io',
      port: 26175,
      user: 'jeff',
      password: '0813210332@Jeff',
      database: 'rhulanituckshop',
    });

    console.log('✅ Connected to database\n');

    const tables = [
      {
        name: 'Users',
        sql: `CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) PRIMARY KEY,
          firstName VARCHAR(255) NOT NULL,
          lastName VARCHAR(255) NOT NULL,
          workNumber VARCHAR(8) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE,
          password VARCHAR(255) NOT NULL,
          role ENUM('Administration', 'Sales', 'Super Administration') NOT NULL,
          pin VARCHAR(6),
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_workNumber (workNumber),
          INDEX idx_email (email)
        )`
      },
      {
        name: 'Products',
        sql: `CREATE TABLE IF NOT EXISTS products (
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
        )`
      },
      {
        name: 'Sales',
        sql: `CREATE TABLE IF NOT EXISTS sales (
          id VARCHAR(36) PRIMARY KEY,
          userId VARCHAR(36) NOT NULL,
          userName VARCHAR(255) NOT NULL,
          items JSON NOT NULL,
          total DECIMAL(10, 2) NOT NULL,
          paymentMethod ENUM('cash', 'card') NOT NULL,
          date DATETIME DEFAULT CURRENT_TIMESTAMP,
          transactionType ENUM('sale', 'withdrawal', 'voucher', 'void', 'return') DEFAULT 'sale',
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id),
          INDEX idx_userId (userId),
          INDEX idx_date (date)
        )`
      },
      {
        name: 'Till Management',
        sql: `CREATE TABLE IF NOT EXISTS till_management (
          id VARCHAR(36) PRIMARY KEY,
          userId VARCHAR(36) NOT NULL,
          userName VARCHAR(255) NOT NULL,
          openingBalance DECIMAL(10, 2) NOT NULL,
          closingBalance DECIMAL(10, 2),
          openedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          closedAt DATETIME,
          status ENUM('open', 'closed') DEFAULT 'open',
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id),
          INDEX idx_userId (userId),
          INDEX idx_status (status),
          INDEX idx_openedAt (openedAt)
        )`
      },
      {
        name: 'Stock Count',
        sql: `CREATE TABLE IF NOT EXISTS stock_count (
          id VARCHAR(36) PRIMARY KEY,
          productId VARCHAR(36) NOT NULL,
          countedQuantity INT NOT NULL,
          systemQuantity INT NOT NULL,
          variance INT NOT NULL,
          countedBy VARCHAR(255) NOT NULL,
          countDate DATETIME DEFAULT CURRENT_TIMESTAMP,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (productId) REFERENCES products(id),
          INDEX idx_productId (productId),
          INDEX idx_countDate (countDate)
        )`
      },
      {
        name: 'Card Transactions',
        sql: `CREATE TABLE IF NOT EXISTS card_transactions (
          id VARCHAR(36) PRIMARY KEY,
          saleId VARCHAR(36) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          cardNumber VARCHAR(19),
          transactionRef VARCHAR(255),
          status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
          processedAt DATETIME,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (saleId) REFERENCES sales(id),
          INDEX idx_saleId (saleId),
          INDEX idx_status (status)
        )`
      }
    ];

    console.log('🚀 Initializing database tables...\n');

    for (const table of tables) {
      try {
        await connection.execute(table.sql);
        console.log(`✅ ${table.name} table ready`);
      } catch (err) {
        if (err.message && err.message.includes('already exists')) {
          console.log(`ℹ️  ${table.name} table already exists`);
        } else {
          console.error(`❌ ${table.name}: ${err.message}`);
        }
      }
    }

    console.log('\n✅ Database initialization completed!');

    // Ensure email column is nullable and has proper schema
    try {
      await connection.execute(`ALTER TABLE users MODIFY email VARCHAR(255) UNIQUE NULL DEFAULT NULL`);
    } catch (err) {
      // Column might already be correct, continue
    }
    const [superAdmins] = await connection.execute(
      'SELECT id FROM users WHERE workNumber = ?',
      ['12345678']
    );
    const adminRows = Array.isArray(superAdmins) ? superAdmins : [];

    if (adminRows.length === 0) {
      await connection.execute(
        `INSERT INTO users (id, firstName, lastName, workNumber, password, role, pin, createdAt)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW())`,
        ['Super', 'Administrator', '12345678', 'Password1', 'Super Administration', null]
      );
      console.log('✓ Super Administrator created: workNumber=12345678, password=Password1');
    } else {
      await connection.execute(
        `UPDATE users SET firstName = ?, lastName = ?, password = ?, role = ? WHERE workNumber = ?`,
        ['Super', 'Administrator', 'Password1', 'Super Administration', '12345678']
      );
      console.log('✓ Super Administrator updated: workNumber=12345678, password=Password1');
    }

    await connection.end();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

initializeDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
