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

async function addUsernameColumn() {
  const connection = await pool.getConnection();

  try {
    console.log('🔧 Adding userName column to sales table...');

    // Check if userName column exists
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM sales LIKE 'userName'"
    );

    if (columns.length === 0) {
      console.log('Adding userName column...');
      await connection.query(`
        ALTER TABLE sales ADD COLUMN userName VARCHAR(255)
      `);
      console.log('✅ Added userName column');
    } else {
      console.log('ℹ️ userName column already exists');
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

addUsernameColumn();
