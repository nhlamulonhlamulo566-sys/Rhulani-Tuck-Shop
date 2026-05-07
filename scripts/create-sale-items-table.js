import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function createMissingTables() {
  const connection = await pool.getConnection();

  try {
    console.log('🔧 Creating missing tables...');

    // Create sale_items table if it doesn't exist
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
    console.log('✅ sale_items table created or already exists');

    console.log('🎉 Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    connection.release();
    pool.end();
  }
}

createMissingTables();
