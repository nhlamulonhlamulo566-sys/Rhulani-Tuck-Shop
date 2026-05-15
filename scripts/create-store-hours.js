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
    console.log('Creating store_hours table...');
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS store_hours (
        id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
        dayOfWeek ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL UNIQUE,
        openingTime TIME NOT NULL,
        closingTime TIME NOT NULL,
        isOpen BOOLEAN DEFAULT TRUE,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updatedBy VARCHAR(255)
      )
    `);
    
    console.log('✓ store_hours table created successfully');
    
    // Check if data exists
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM store_hours');
    
    if (rows[0].count === 0) {
      console.log('Inserting default store hours...');
      const defaultHours = [
        ['Monday', '07:30', '20:00', true],
        ['Tuesday', '07:30', '20:00', true],
        ['Wednesday', '07:30', '20:00', true],
        ['Thursday', '07:30', '20:00', true],
        ['Friday', '07:30', '20:00', true],
        ['Saturday', '08:00', '15:00', true],
        ['Sunday', '08:00', '15:00', true],
      ];
      
      for (const [day, opening, closing, isOpen] of defaultHours) {
        await connection.execute(
          'INSERT INTO store_hours (dayOfWeek, openingTime, closingTime, isOpen) VALUES (?, ?, ?, ?)',
          [day, opening, closing, isOpen]
        );
      }
      console.log('✓ Default store hours inserted');
    } else {
      console.log('✓ Store hours already exist');
    }
    
    console.log('✓ All done!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    connection.release();
    pool.end();
  }
})();

