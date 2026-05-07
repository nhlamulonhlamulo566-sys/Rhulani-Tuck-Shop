const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

async function checkAndFixSchema() {
  const connection = await pool.getConnection();
  
  try {
    console.log('\n📋 Checking database schema...\n');
    
    // Get all tables
    const [tables] = await connection.query(`SHOW TABLES`);
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log('📊 Existing tables:', tableNames);
    
    // Check sales table columns
    if (tableNames.includes('sales')) {
      const [columns] = await connection.query(`SHOW COLUMNS FROM sales`);
      const columnNames = columns.map(c => c.Field);
      console.log('\n📌 Sales table columns:', columnNames);
      
      if (!columnNames.includes('status')) {
        console.log('⚠️  Adding missing status column to sales table...');
        await connection.query(`
          ALTER TABLE sales ADD COLUMN status ENUM('Completed', 'Voided', 'Returned', 'Partially Returned') NOT NULL DEFAULT 'Completed'
        `);
        console.log('✅ Status column added');
      }
      
      if (!columnNames.includes('transactionType')) {
        console.log('⚠️  Adding missing transactionType column to sales table...');
        await connection.query(`
          ALTER TABLE sales ADD COLUMN transactionType ENUM('sale', 'withdrawal', 'void', 'return') NOT NULL DEFAULT 'sale'
        `);
        console.log('✅ TransactionType column added');
      }
      
      if (!columnNames.includes('withdrawalReason')) {
        console.log('⚠️  Adding missing withdrawalReason column to sales table...');
        await connection.query(`
          ALTER TABLE sales ADD COLUMN withdrawalReason VARCHAR(255)
        `);
        console.log('✅ WithdrawalReason column added');
      }
    }
    
    // Check for till_management table (should be till_sessions)
    if (!tableNames.includes('till_management') && tableNames.includes('till_sessions')) {
      console.log('\n⚠️  Renaming till_sessions to till_management...');
      await connection.query(`RENAME TABLE till_sessions TO till_management`);
      console.log('✅ Table renamed');
    }
    
    // Check for sale_items table (should be sales_items)
    if (!tableNames.includes('sales_items') && tableNames.includes('sale_items')) {
      console.log('\n⚠️  Renaming sale_items to sales_items...');
      await connection.query(`RENAME TABLE sale_items TO sales_items`);
      console.log('✅ Table renamed');
    }
    
    // Ensure all required tables exist
    const requiredTables = [
      'users',
      'products',
      'sales',
      'sales_items',
      'till_management',
      'stock_count',
      'card_transactions',
      'transaction_audit_log',
      'reconciliation_history',
      'audit_logs'
    ];
    
    console.log('\n📋 Checking for all required tables...');
    for (const table of requiredTables) {
      if (tableNames.includes(table)) {
        console.log(`  ✅ ${table}`);
      } else {
        console.log(`  ❌ ${table} - MISSING`);
      }
    }
    
    console.log('\n✨ Schema check complete!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.release();
    await pool.end();
  }
}

checkAndFixSchema();
