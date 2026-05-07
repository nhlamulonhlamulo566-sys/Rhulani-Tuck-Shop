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

async function addMissingColumns() {
  const connection = await pool.getConnection();

  try {
    console.log('🔧 Adding missing columns to sales table...');

    // Check and add transactionType column
    const [transactionTypeColumns] = await connection.query(
      "SHOW COLUMNS FROM sales LIKE 'transactionType'"
    );
    if (transactionTypeColumns.length === 0) {
      await connection.query(`
        ALTER TABLE sales ADD COLUMN transactionType ENUM('sale', 'withdrawal', 'voucher')
      `);
      console.log('✅ Added transactionType column');
    } else {
      console.log('ℹ️ transactionType column already exists');
    }

    // Check and add withdrawalReason column
    const [withdrawalReasonColumns] = await connection.query(
      "SHOW COLUMNS FROM sales LIKE 'withdrawalReason'"
    );
    if (withdrawalReasonColumns.length === 0) {
      await connection.query(`
        ALTER TABLE sales ADD COLUMN withdrawalReason TEXT
      `);
      console.log('✅ Added withdrawalReason column');
    } else {
      console.log('ℹ️ withdrawalReason column already exists');
    }

    // Check and add cardTransactionId column
    const [cardTransactionIdColumns] = await connection.query(
      "SHOW COLUMNS FROM sales LIKE 'cardTransactionId'"
    );
    if (cardTransactionIdColumns.length === 0) {
      await connection.query(`
        ALTER TABLE sales ADD COLUMN cardTransactionId VARCHAR(255)
      `);
      console.log('✅ Added cardTransactionId column');
    } else {
      console.log('ℹ️ cardTransactionId column already exists');
    }

    // Check and add authorizations column
    const [authorizationsColumns] = await connection.query(
      "SHOW COLUMNS FROM sales LIKE 'authorizations'"
    );
    if (authorizationsColumns.length === 0) {
      await connection.query(`
        ALTER TABLE sales ADD COLUMN authorizations JSON
      `);
      console.log('✅ Added authorizations column');
    } else {
      console.log('ℹ️ authorizations column already exists');
    }

    console.log('🎉 Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    connection.release();
    pool.end();
  }
}

addMissingColumns();