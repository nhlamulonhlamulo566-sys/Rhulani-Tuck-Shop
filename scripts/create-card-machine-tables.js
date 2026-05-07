const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function createCardMachineTables() {
  const pool = mysql.createPool({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '3306'),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  });

  try {
    const connection = await pool.getConnection();

    console.log('Creating card_machine_config table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS card_machine_config (
        id VARCHAR(255) PRIMARY KEY,
        deviceName VARCHAR(255) NOT NULL,
        serialNumber VARCHAR(255) UNIQUE,
        deviceType ENUM('Verifone', 'Ingenico', 'PAX', 'Square', 'Other') NOT NULL,
        port VARCHAR(255),
        baudRate INT DEFAULT 9600,
        ipAddress VARCHAR(255),
        port_number INT,
        isActive BOOLEAN DEFAULT true,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ card_machine_config table created/verified');

    console.log('Creating merchant_gateway_config table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS merchant_gateway_config (
        id VARCHAR(255) PRIMARY KEY,
        merchantName VARCHAR(255) NOT NULL,
        merchantId VARCHAR(255),
        apiKey VARCHAR(500),
        apiSecret VARCHAR(500),
        gatewayType ENUM('Payfast', 'Capitec', 'Nedbank', 'FNB', 'ABSA', 'PayU', 'Stripe', 'Square', 'Custom') NOT NULL,
        testMode BOOLEAN DEFAULT true,
        isActive BOOLEAN DEFAULT true,
        contactEmail VARCHAR(255),
        contactPhone VARCHAR(255),
        supportContact VARCHAR(500),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ merchant_gateway_config table created/verified');

    console.log('Creating card_transactions_log table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS card_transactions_log (
        id VARCHAR(255) PRIMARY KEY,
        machineId VARCHAR(255),
        merchantId VARCHAR(255),
        transactionId VARCHAR(255) UNIQUE,
        amount DECIMAL(10, 2),
        currency VARCHAR(3) DEFAULT 'ZAR',
        cardLastFour VARCHAR(4),
        cardType ENUM('Visa', 'Mastercard', 'Amex', 'Other') DEFAULT 'Other',
        transactionStatus ENUM('Success', 'Failed', 'Pending', 'Declined') DEFAULT 'Pending',
        responseCode VARCHAR(255),
        responseMessage TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (machineId) REFERENCES card_machine_config(id) ON DELETE SET NULL,
        FOREIGN KEY (merchantId) REFERENCES merchant_gateway_config(id) ON DELETE SET NULL
      )
    `);
    console.log('✓ card_transactions_log table created/verified');

    console.log('Creating card_machine_health table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS card_machine_health (
        id VARCHAR(255) PRIMARY KEY,
        machineId VARCHAR(255),
        connectionStatus ENUM('Connected', 'Disconnected', 'Error') DEFAULT 'Disconnected',
        signalStrength INT DEFAULT 0,
        lastHeartbeat TIMESTAMP,
        errorMessage TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (machineId) REFERENCES card_machine_config(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ card_machine_health table created/verified');

    console.log('\n✅ All card machine tables created successfully!');
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    process.exit(1);
  }
}

createCardMachineTables();
