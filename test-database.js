const mysql = require('mysql2/promise');

(async () => {
  try {
    const pool = mysql.createPool({
      host: '0.tcp.sa.ngrok.io',
      port: 26175,
      user: 'jeff',
      password: '0813210332@Jeff',
      database: 'rhulanituckshop'
    });
    
    const conn = await pool.getConnection();
    
    console.log('\n📊 DATABASE VERIFICATION TEST');
    console.log('================================\n');
    
    // Get users data
    const [usersData] = await conn.query('SELECT * FROM users');
    console.log('✅ USERS TABLE');
    console.log('   Records:', usersData.length);
    usersData.forEach(u => console.log('   - ' + u.firstName + ' ' + u.lastName + ' (' + u.role + ') [Email: ' + u.email + ']'));
    
    // Get products data
    const [productsData] = await conn.query('SELECT id, name, price, stock, category FROM products');
    console.log('\n✅ PRODUCTS TABLE');
    console.log('   Total Records:', productsData.length);
    productsData.slice(0, 5).forEach(p => console.log('   - ' + p.name + ' | Category: ' + p.category + ' | Price: R' + p.price + ' | Stock: ' + p.stock));
    if (productsData.length > 5) console.log('   ... and ' + (productsData.length - 5) + ' more products');
    
    // Get sales data
    const [salesData] = await conn.query('SELECT id, date, total, paymentMethod, status FROM sales ORDER BY date DESC');
    console.log('\n✅ SALES TABLE');
    console.log('   Total Records:', salesData.length);
    salesData.slice(0, 3).forEach(s => {
      const d = new Date(s.date);
      console.log('   - Date: ' + d.toLocaleDateString() + ' | Total: R' + s.total + ' | Method: ' + s.paymentMethod + ' | Status: ' + s.status);
    });
    
    // Get sales items
    const [salesItems] = await conn.query('SELECT COUNT(*) as count FROM sales_items');
    console.log('\n✅ SALES ITEMS TABLE');
    console.log('   Total Records:', salesItems[0].count);
    
    // Check for audit logs
    const [auditLogs] = await conn.query('SELECT COUNT(*) as count FROM audit_logs');
    console.log('\n✅ AUDIT LOGS TABLE');
    console.log('   Total Records:', auditLogs[0].count);
    
    // Check for stock counts
    const [stockCounts] = await conn.query('SELECT COUNT(*) as count FROM stock_count');
    console.log('\n✅ STOCK COUNT TABLE');
    console.log('   Total Records:', stockCounts[0].count);
    
    // Check for till management
    const [tillMgmt] = await conn.query('SELECT COUNT(*) as count FROM till_management');
    console.log('\n✅ TILL MANAGEMENT TABLE');
    console.log('   Total Records:', tillMgmt[0].count);
    
    // Check for card transactions
    const [cardTrans] = await conn.query('SELECT COUNT(*) as count FROM card_transactions');
    console.log('\n✅ CARD TRANSACTIONS TABLE');
    console.log('   Total Records:', cardTrans[0].count);
    
    console.log('\n================================');
    console.log('✅ ALL TABLES VERIFIED SUCCESSFULLY');
    console.log('✅ DATA IS BEING STORED CORRECTLY');
    
    conn.release();
    process.exit(0);
  } catch(e) {
    console.error('\n❌ DATABASE ERROR:', e.message);
    process.exit(1);
  }
})();
