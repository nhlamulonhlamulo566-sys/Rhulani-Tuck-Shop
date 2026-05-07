import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  multipleStatements: true,
});

export async function query(sql: string, values?: any[]) {
  try {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(sql, values);
      return rows;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export default pool;
