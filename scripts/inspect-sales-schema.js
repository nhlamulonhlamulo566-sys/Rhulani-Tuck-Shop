import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function inspect() {
  const pool = mysql.createPool({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });

  const connection = await pool.getConnection();
  try {
    const [transactionTypeRows] = await connection.query("SHOW COLUMNS FROM sales LIKE 'transactionType'");
    const [voucherNumberRows] = await connection.query("SHOW COLUMNS FROM sales LIKE 'voucherNumber'");
    console.log('transactionType:', JSON.stringify(transactionTypeRows, null, 2));
    console.log('voucherNumber:', JSON.stringify(voucherNumberRows, null, 2));
  } catch (error) {
    console.error('Inspection failed:', error);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

inspect();
