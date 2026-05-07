#!/usr/bin/env node

/**
 * Desktop App Initialization Script
 * Handles MySQL setup and database initialization for Electron app
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { execSync } = require('child_process');

const DB_CONFIG = {
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || 'root',
  database: process.env.DATABASE_NAME || 'rhulanituckshop',
};

const SCHEMA_PATH = path.join(__dirname, 'docs', 'db-schema.sql');

async function initializeDatabase() {
  try {
    console.log('🔍 Checking database connection...');
    
    const connection = await mysql.createConnection({
      host: DB_CONFIG.host,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
    });

    // Create database if it doesn't exist
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\``
    );
    console.log('✓ Database created or already exists');

    // Switch to the database
    await connection.changeUser({ database: DB_CONFIG.database });

    // Read and execute schema
    if (fs.existsSync(SCHEMA_PATH)) {
      console.log('📋 Loading database schema...');
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
      
      // Split and execute statements
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      for (const statement of statements) {
        try {
          await connection.execute(statement);
        } catch (err) {
          // Table already exists errors can be ignored
          if (!err.message.includes('already exists')) {
            console.warn('⚠ Schema warning:', err.message);
          }
        }
      }
      console.log('✓ Database schema initialized');
    }

    await connection.end();
    console.log('✅ Database initialization complete');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    return false;
  }
}

async function setupDesktopApp() {
  console.log('🚀 Rhulani Tuck Shop - Desktop Setup\n');

  // Check for MySQL
  const platform = process.platform;
  const mysqlPaths = {
    win32: 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqld.exe',
    darwin: '/usr/local/mysql/bin/mysqld',
    linux: '/usr/sbin/mysqld',
  };

  const expectedPath = mysqlPaths[platform];
  const mysqlExists = fs.existsSync(expectedPath);

  if (!mysqlExists && platform === 'win32') {
    console.log('⚠ MySQL not found at expected location');
    console.log('📥 To complete setup, install MySQL Community Server from:');
    console.log('   https://dev.mysql.com/downloads/mysql/');
    console.log('');
  } else if (mysqlExists) {
    console.log('✓ MySQL found');
  }

  // Initialize database
  const success = await initializeDatabase();

  if (success) {
    console.log('\n✅ Setup complete! The app is ready to use.');
    console.log('🎯 Start the app with: npm start');
  } else {
    console.log('\n⚠ Setup encountered issues. Please check your MySQL installation.');
    process.exit(1);
  }
}

// Run setup if this is the main module
if (require.main === module) {
  setupDesktopApp().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { initializeDatabase };
