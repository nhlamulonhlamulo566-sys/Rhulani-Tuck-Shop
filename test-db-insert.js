import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config({ path: '.env.local' });

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

async function testInsert() {
  const connection = await pool.getConnection();
  try {
    console.log('Testing manual INSERT...');
    const saleId = randomUUID();
    const result = await connection.query(
      'INSERT INTO sales (id, date, total, customerName, userId, paymentMethod, salesperson, status) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?)',
      [saleId, 50, 'Test Customer', '08d65c9e-4793-11f1-81d6-025056947af1', 'Cash', 'Test Salesperson', 'Completed']
    );
    console.log('INSERT result:', result);

    const [rows] = await connection.query('SELECT * FROM sales WHERE id = ?', [saleId]);
    console.log('Created sale:', rows[0]);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    connection.release();
    pool.end();
  }
}

testInsert();