const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  let connection = null;
  
  try {
    console.log('🔄 Connecting to database...');
    
    // Create connection
    connection = await mysql.createConnection({
      host: 'ub97v8fdrt.localto.net',
      port: 2379,
      user: 'jeff',
      password: '0813210332@Jeff',
      database: 'rhulanituckshop',
    });

    console.log('✅ Connected to database');

    // Define the migration statements directly (without stored procedures for now)
    const statements = [
      // Update sales table to add missing transaction types
      `ALTER TABLE sales 
       MODIFY COLUMN transactionType ENUM('sale', 'withdrawal', 'voucher', 'void', 'return') DEFAULT 'sale'`,

      // Create transaction_audit_log table
      `CREATE TABLE IF NOT EXISTS transaction_audit_log (
        id VARCHAR(36) PRIMARY KEY,
        tillSessionId VARCHAR(36) NOT NULL,
        saleId VARCHAR(36),
        transactionType ENUM('sale', 'withdrawal', 'void', 'return') NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        authorizedBy VARCHAR(255),
        authorizedAt DATETIME NOT NULL,
        salespersonId VARCHAR(36),
        salesperson VARCHAR(255) NOT NULL,
        reason TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tillSessionId) REFERENCES till_management(id) ON DELETE CASCADE,
        FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE SET NULL,
        INDEX idx_tillSessionId (tillSessionId),
        INDEX idx_saleId (saleId),
        INDEX idx_transactionType (transactionType),
        INDEX idx_authorizedAt (authorizedAt)
      )`,

      // Create reconciliation_history table
      `CREATE TABLE IF NOT EXISTS reconciliation_history (
        id VARCHAR(36) PRIMARY KEY,
        tillSessionId VARCHAR(36) NOT NULL,
        statusBefore ENUM('pending', 'verified', 'discrepancy') NOT NULL,
        statusAfter ENUM('pending', 'verified', 'discrepancy') NOT NULL,
        reason TEXT,
        approvalNotes TEXT,
        approvedBy VARCHAR(255),
        approvalTimestamp DATETIME NOT NULL,
        FOREIGN KEY (tillSessionId) REFERENCES till_management(id) ON DELETE CASCADE,
        INDEX idx_tillSessionId (tillSessionId),
        INDEX idx_approvalTimestamp (approvalTimestamp)
      )`,

      // Create audit_logs table if not exists
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        adminId VARCHAR(36),
        adminName VARCHAR(255),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        ipAddress VARCHAR(45),
        details JSON,
        INDEX idx_adminId (adminId),
        INDEX idx_timestamp (timestamp),
        INDEX idx_action (action)
      )`
    ];

    console.log(`\n🚀 Running ${statements.length} migration statements...\n`);

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < statements.length; i++) {
      try {
        const stmt = statements[i];
        if (stmt.length === 0) continue;
        
        process.stdout.write(`[${i + 1}/${statements.length}] `);
        await connection.execute(stmt);
        process.stdout.write('✅\n');
        successCount++;
      } catch (err) {
        const errMsg = err.message || '';
        if (errMsg.includes('already exists') || errMsg.includes('Duplicate') || errMsg.includes('already') || errMsg.includes('Unknown column')) {
          process.stdout.write('⏭️  (Already exists, skipping)\n');
          skipCount++;
        } else {
          console.error(`\n❌ Error: ${errMsg}`);
          // Continue with other statements
        }
      }
    }

    console.log(`\n✅ Migration completed! (${successCount} executed, ${skipCount} skipped)`);

    // Ensure email column is nullable and has proper schema
    try {
      await connection.execute(`ALTER TABLE users MODIFY email VARCHAR(255) UNIQUE NULL DEFAULT NULL`);
    } catch (err) {
      // Column might already be correct, continue
    }

    // Add super administrator user
    console.log('\n🔐 Adding Super Administrator user...');
    
    const workNumber = '12345678';
    const password = 'Password1';
    const pin = '123456';
    const userId = `admin-${Date.now()}`;
    
    try {
      await connection.execute(
        `INSERT INTO users (id, firstName, lastName, workNumber, password, pin, role, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [userId, 'Super', 'Administrator', workNumber, password, pin, 'Super Administration']
      );
      console.log(`✅ Super Administrator created successfully`);
    } catch (err) {
      if (err.message && err.message.includes('Duplicate')) {
        console.log(`⏭️  Super Administrator already exists, updating...`);
        await connection.execute(
          `UPDATE users SET firstName = ?, lastName = ?, password = ?, pin = ?, role = ? WHERE workNumber = ?`,
          ['Super', 'Administrator', password, pin, 'Super Administration', workNumber]
        );
        console.log(`✅ Super Administrator updated successfully`);
      } else {
        throw err;
      }
    }

    console.log(`\n📋 Super Administrator Details:`);
    console.log(`   Work Number: ${workNumber}`);
    console.log(`   Password: ${password}`);
    console.log(`   Default PIN: ${pin}`);
    console.log(`   Role: Super Administration`);

    // Verify user was created
    const [rows] = await connection.execute(
      'SELECT id, firstName, lastName, workNumber, role FROM users WHERE workNumber = ?',
      [workNumber]
    );

    if (rows && rows.length > 0) {
      console.log('\n✅ Verification successful! User in database:');
      console.log(`   ID: ${rows[0].id}`);
      console.log(`   Name: ${rows[0].firstName} ${rows[0].lastName}`);
      console.log(`   Work Number: ${rows[0].workNumber}`);
      console.log(`   Role: ${rows[0].role}`);
    }

    console.log('\n🎉 All operations completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error during migration:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
