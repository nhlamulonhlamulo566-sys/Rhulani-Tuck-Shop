const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

async function createMissingTables() {
  const connection = await pool.getConnection();
  
  try {
    console.log('\n🔧 Creating missing tables...\n');
    
    // Create sales_items table
    console.log('Creating sales_items table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sales_items (
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
      )
    `);
    console.log('✅ sales_items table created');
    
    // Create card_machine_config if missing
    console.log('Creating card_machine_config table...');
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
      )
    `);
    console.log('✅ card_machine_config table created');
    
    // Create merchant_gateway_config if missing
    console.log('Creating merchant_gateway_config table...');
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
      )
    `);
    console.log('✅ merchant_gateway_config table created');
    
    // Create card_machine_health if missing
    console.log('Creating card_machine_health table...');
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
      )
    `);
    console.log('✅ card_machine_health table created');
    
    // Create card_transactions_log if missing
    console.log('Creating card_transactions_log table...');
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
      )
    `);
    console.log('✅ card_transactions_log table created');
    
    console.log('\n✨ All missing tables created successfully!');
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Tables already exist (skipping)');
    } else {
      console.error('Error:', error.message);
    }
  } finally {
    await connection.release();
    await pool.end();
  }
}

createMissingTables();
