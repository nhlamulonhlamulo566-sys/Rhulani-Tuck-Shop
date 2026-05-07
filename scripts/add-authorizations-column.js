import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'rhulanituckshop',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function addAuthorizationsColumn() {
  const connection = await pool.getConnection();

  try {
    console.log('🔧 Adding authorizations column to sales table...');

    // Check if column exists first
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM sales LIKE 'authorizations'"
    );

    if (columns.length === 0) {
      await connection.query(`
        ALTER TABLE sales ADD COLUMN authorizations JSON
      `);
      console.log('✅ Authorizations column added successfully');
    } else {
      console.log('ℹ️ Authorizations column already exists');
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

addAuthorizationsColumn();