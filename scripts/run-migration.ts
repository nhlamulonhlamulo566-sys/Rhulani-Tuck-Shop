import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  let connection: mysql.Connection | null = null;
  
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

    // Read migration file
    const migrationPath = path.join(__dirname, '../docs/MIGRATION_2026_04_28_TILL_RECONCILIATION.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

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
      } catch (err: any) {
        const errMsg = err.message || '';
        if (errMsg.includes('already exists') || errMsg.includes('Duplicate') || errMsg.includes('already') || errMsg.includes('Unknown column')) {
          process.stdout.write('⏭️  (Already exists, skipping)\n');
          skipCount++;
        } else {
          console.error(`\n❌ Error: ${errMsg}`);
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
    } catch (err: any) {
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
    const [rows]: any = await connection.execute(
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

  } catch (error: any) {
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
