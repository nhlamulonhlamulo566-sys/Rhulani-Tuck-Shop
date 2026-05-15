const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.DATABASE_HOST || 'ub97v8fdrt.localto.net',
      port: process.env.DATABASE_PORT || 2379,
      user: process.env.DATABASE_USER || 'jeff',
      password: process.env.DATABASE_PASSWORD || '0813210332@Jeff',
      database: process.env.DATABASE_NAME || 'rhulanituckshop',
      multipleStatements: true
    });

    const conn = await pool.getConnection();
    console.log('\n📝 SETTING UP TEST USER AND STORE HOURS\n');

    // Create test admin user
    const userId = uuidv4();
    const sql = `
      INSERT IGNORE INTO users (id, firstName, lastName, email, password, role) 
      VALUES ('${userId}', 'Test', 'Admin', 'admin@test.com', 'password123', 'Administration');
      
      INSERT IGNORE INTO store_hours (dayOfWeek, isOpen, openingTime, closingTime) 
      VALUES 
        ('Monday', 1, '08:00', '18:00'),
        ('Tuesday', 1, '08:00', '18:00'),
        ('Wednesday', 1, '08:00', '18:00'),
        ('Thursday', 1, '08:00', '18:00'),
        ('Friday', 1, '08:00', '18:00'),
        ('Saturday', 1, '08:00', '16:00'),
        ('Sunday', 0, '00:00', '00:00');
    `;

    await conn.query(sql);
    
    // Verify
    const [users] = await conn.query('SELECT * FROM users WHERE email = ?', ['admin@test.com']);
    const [hours] = await conn.query('SELECT * FROM store_hours');
    
    console.log('✅ Test admin user created: admin@test.com / password123');
    console.log('✅ Store hours configured for the week');
    console.log(`\nTotal users: ${users.length}`);
    console.log(`Total store hours configured: ${hours.length}`);

    await conn.release();
    await pool.end();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

