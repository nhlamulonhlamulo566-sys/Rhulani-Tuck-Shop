const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST || 'ub97v8fdrt.localto.net',
  port: parseInt(process.env.DATABASE_PORT || '2379'),
  database: process.env.DATABASE_NAME || 'rhulanituckshop',
  user: process.env.DATABASE_USER || 'jeff',
  password: process.env.DATABASE_PASSWORD || '0813210332@Jeff',
});

(async () => {
  const connection = await pool.getConnection();
  try {
    console.log('Adding PIN columns to users table...');
    
    // Check if pin column exists
    const [pinCheckResult] = await connection.execute(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME=? AND TABLE_SCHEMA=? AND COLUMN_NAME=?',
      ['users', 'rhulanituckshop', 'pin']
    );
    
    if (pinCheckResult.length === 0) {
      await connection.execute('ALTER TABLE users ADD COLUMN pin VARCHAR(6) NULL');
      console.log('✓ Added pin column');
    } else {
      console.log('✓ pin column already exists');
    }
    
    // Check if pin_expires_at column exists
    const [expiresCheckResult] = await connection.execute(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME=? AND TABLE_SCHEMA=? AND COLUMN_NAME=?',
      ['users', 'rhulanituckshop', 'pin_expires_at']
    );
    
    if (expiresCheckResult.length === 0) {
      await connection.execute('ALTER TABLE users ADD COLUMN pin_expires_at DATETIME NULL');
      console.log('✓ Added pin_expires_at column');
    } else {
      console.log('✓ pin_expires_at column already exists');
    }
    
    console.log('✓ All PIN columns added successfully');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    connection.release();
    pool.end();
  }
})();

