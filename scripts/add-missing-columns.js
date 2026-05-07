const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

async function addMissingColumns() {
  const connection = await pool.getConnection();
  
  try {
    console.log('\n🔧 Adding missing columns to tables...\n');
    
    // Check and add missing columns to till_management
    console.log('Checking till_management table...');
    const [tmColumns] = await connection.query(`SHOW COLUMNS FROM till_management`);
    const tmColumnNames = tmColumns.map(c => c.Field);
    
    if (!tmColumnNames.includes('reconciliationStatus')) {
      console.log('  Adding reconciliationStatus column...');
      await connection.query(`
        ALTER TABLE till_management ADD COLUMN reconciliationStatus ENUM('pending', 'verified', 'discrepancy') DEFAULT 'pending'
      `);
      console.log('  ✅ Added reconciliationStatus');
    }
    
    if (!tmColumnNames.includes('reconciliationNotes')) {
      console.log('  Adding reconciliationNotes column...');
      await connection.query(`
        ALTER TABLE till_management ADD COLUMN reconciliationNotes TEXT
      `);
      console.log('  ✅ Added reconciliationNotes');
    }
    
    if (!tmColumnNames.includes('reconciliationApprovedBy')) {
      console.log('  Adding reconciliationApprovedBy column...');
      await connection.query(`
        ALTER TABLE till_management ADD COLUMN reconciliationApprovedBy VARCHAR(255)
      `);
      console.log('  ✅ Added reconciliationApprovedBy');
    }
    
    if (!tmColumnNames.includes('reconciliationApprovedAt')) {
      console.log('  Adding reconciliationApprovedAt column...');
      await connection.query(`
        ALTER TABLE till_management ADD COLUMN reconciliationApprovedAt DATETIME
      `);
      console.log('  ✅ Added reconciliationApprovedAt');
    }
    
    if (!tmColumnNames.includes('difference')) {
      console.log('  Adding difference column...');
      await connection.query(`
        ALTER TABLE till_management ADD COLUMN difference DECIMAL(10, 2)
      `);
      console.log('  ✅ Added difference');
    }
    
    if (!tmColumnNames.includes('varianceReason')) {
      console.log('  Adding varianceReason column...');
      await connection.query(`
        ALTER TABLE till_management ADD COLUMN varianceReason VARCHAR(255)
      `);
      console.log('  ✅ Added varianceReason');
    }
    
    if (!tmColumnNames.includes('startedBy')) {
      console.log('  Adding startedBy column...');
      await connection.query(`
        ALTER TABLE till_management ADD COLUMN startedBy VARCHAR(255)
      `);
      console.log('  ✅ Added startedBy');
    }
    
    if (!tmColumnNames.includes('closedBy')) {
      console.log('  Adding closedBy column...');
      await connection.query(`
        ALTER TABLE till_management ADD COLUMN closedBy VARCHAR(255)
      `);
      console.log('  ✅ Added closedBy');
    }
    
    // Check and add missing columns to sales
    console.log('\nChecking sales table...');
    const [salColumns] = await connection.query(`SHOW COLUMNS FROM sales`);
    const salColumnNames = salColumns.map(c => c.Field);
    
    if (!salColumnNames.includes('customerName')) {
      console.log('  Adding customerName column...');
      await connection.query(`
        ALTER TABLE sales ADD COLUMN customerName VARCHAR(255)
      `);
      console.log('  ✅ Added customerName');
    }
    
    if (!salColumnNames.includes('salesperson')) {
      console.log('  Adding salesperson column...');
      await connection.query(`
        ALTER TABLE sales ADD COLUMN salesperson VARCHAR(255)
      `);
      console.log('  ✅ Added salesperson');
    }
    
    console.log('\n✨ All missing columns added successfully!');
    
  } catch (error) {
    if (error.message.includes('Duplicate column')) {
      console.log('✅ Columns already exist (skipping)');
    } else {
      console.error('Error:', error.message);
    }
  } finally {
    await connection.release();
    await pool.end();
  }
}

addMissingColumns();
