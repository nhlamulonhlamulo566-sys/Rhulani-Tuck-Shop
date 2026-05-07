import { query } from '@/lib/db';
import { randomUUID } from 'crypto';

async function ensureColumn(table: string, column: string, definition: string) {
  const escapedTable = table.replace(/`/g, '``');
  const escapedColumn = column.replace(/`/g, '``');
  const existing = await query(`SHOW COLUMNS FROM \`${escapedTable}\` LIKE '${escapedColumn}'`) as any[];
  if (!Array.isArray(existing) || existing.length === 0) {
    await query(`ALTER TABLE \`${escapedTable}\` ADD COLUMN ${definition}`);
  }
}

async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');

    // Users Table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        firstName VARCHAR(255) NOT NULL,
        lastName VARCHAR(255) NOT NULL,
        workNumber VARCHAR(8) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('Administration', 'Sales', 'Super Administration') NOT NULL,
        pin VARCHAR(6),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_workNumber (workNumber),
        INDEX idx_email (email)
      )
    `);
    console.log('✓ Users table created');

    // Ensure workNumber exists for legacy rows
    await ensureColumn('users', 'workNumber', 'workNumber VARCHAR(8) UNIQUE NULL');
    const rowsWithoutWorkNumber = await query(`SELECT id FROM users WHERE workNumber IS NULL OR workNumber = ''`) as any[];
    if (rowsWithoutWorkNumber.length > 0) {
      const existingRows = await query(`SELECT workNumber FROM users WHERE workNumber IS NOT NULL AND workNumber != ''`) as any[];
      const usedWorkNumbers = new Set(existingRows.map((row: any) => row.workNumber));
      let nextValue = 10000000;

      for (const row of rowsWithoutWorkNumber) {
        let candidate = String(nextValue).padStart(8, '0');
        while (usedWorkNumbers.has(candidate)) {
          nextValue += 1;
          candidate = String(nextValue).padStart(8, '0');
        }
        usedWorkNumbers.add(candidate);
        await query(`UPDATE users SET workNumber = ? WHERE id = ?`, [candidate, row.id]);
        nextValue += 1;
      }
    }

    await query(`ALTER TABLE users MODIFY workNumber VARCHAR(8) UNIQUE NOT NULL`);

    // Ensure a Super Administrator test user exists
    const superAdminRows = await query(`SELECT id FROM users WHERE workNumber = ?`, ['12345678']) as any[];
    if (superAdminRows.length === 0) {
      await query(
        `INSERT INTO users (id, firstName, lastName, workNumber, email, password, role, pin, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [randomUUID(), 'Super', 'Administrator', '12345678', null, 'Password1', 'Super Administration', null]
      );
      console.log('✓ Super Administrator created: workNumber=12345678, password=Password1');
    } else {
      await query(
        `UPDATE users SET firstName = ?, lastName = ?, password = ?, role = ? WHERE id = ?`,
        ['Super', 'Administrator', 'Password1', 'Super Administration', superAdminRows[0].id]
      );
      console.log('✓ Super Administrator updated: workNumber=12345678, password=Password1');
    }

    // Products Table
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        stock INT NOT NULL,
        lowStockThreshold INT NOT NULL,
        description TEXT,
        imageUrl VARCHAR(500),
        imageHint VARCHAR(255),
        barcode VARCHAR(100),
        barcodePack VARCHAR(100),
        packSize INT,
        barcodeCase VARCHAR(100),
        caseSize INT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_name (name)
      )
    `);
    console.log('✓ Products table created');

    // Sales Table
    await query(`
      CREATE TABLE IF NOT EXISTS sales (
        id VARCHAR(36) PRIMARY KEY,
        date DATETIME NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        customerName VARCHAR(255),
        userId VARCHAR(36) NOT NULL,
        paymentMethod ENUM('Card', 'Cash', 'Transfer'),
        subtotal DECIMAL(10, 2),
        tax DECIMAL(10, 2),
        amountPaid DECIMAL(10, 2),
        change DECIMAL(10, 2),
        salesperson VARCHAR(255) NOT NULL,
        status ENUM('Completed', 'Voided', 'Returned', 'Partially Returned') NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id),
        INDEX idx_date (date),
        INDEX idx_userId (userId)
      )
    `);
    console.log('✓ Sales table created');

    // Sale Items Table
    await query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id VARCHAR(36) PRIMARY KEY,
        saleId VARCHAR(36) NOT NULL,
        productId VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        returnedQuantity INT DEFAULT 0,
        FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (productId) REFERENCES products(id),
        INDEX idx_saleId (saleId),
        INDEX idx_productId (productId)
      )
    `);
    console.log('✓ Sale Items table created');

    // Returns Table
    await query(`
      CREATE TABLE IF NOT EXISTS returns (
        id VARCHAR(36) PRIMARY KEY,
        saleId VARCHAR(36) NOT NULL,
        date DATETIME NOT NULL,
        reason VARCHAR(255),
        status VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (saleId) REFERENCES sales(id),
        INDEX idx_saleId (saleId)
      )
    `);
    console.log('✓ Returns table created');

    // Stock Count Table
    await query(`
      CREATE TABLE IF NOT EXISTS stock_counts (
        id VARCHAR(36) PRIMARY KEY,
        productId VARCHAR(36) NOT NULL,
        countedQuantity INT NOT NULL,
        systemQuantity INT NOT NULL,
        variance INT,
        countDate DATETIME NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (productId) REFERENCES products(id),
        INDEX idx_productId (productId),
        INDEX idx_countDate (countDate)
      )
    `);
    console.log('✓ Stock Count table created');

    // Till Management Table
    await query(`
      CREATE TABLE IF NOT EXISTS till_management (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        openingBalance DECIMAL(10, 2) NOT NULL,
        closingBalance DECIMAL(10, 2),
        openedAt DATETIME NOT NULL,
        closedAt DATETIME,
        closedBy VARCHAR(255),
        expectedCash DECIMAL(10, 2),
        countedCash DECIMAL(10, 2),
        difference DECIMAL(10, 2),
        reconciliationStatus ENUM('pending', 'verified', 'discrepancy') DEFAULT 'pending',
        reconciliationNotes TEXT,
        reconciliationApprovedBy VARCHAR(255),
        reconciliationApprovedAt DATETIME,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id),
        INDEX idx_userId (userId),
        INDEX idx_openedAt (openedAt)
      )
    `);
    console.log('✓ Till Management table created');

    await ensureColumn('till_management', 'closedBy', 'closedBy VARCHAR(255)');
    await ensureColumn('till_management', 'expectedCash', 'expectedCash DECIMAL(10, 2)');
    await ensureColumn('till_management', 'countedCash', 'countedCash DECIMAL(10, 2)');
    await ensureColumn('till_management', 'difference', 'difference DECIMAL(10, 2)');
    await ensureColumn('till_management', 'reconciliationStatus', "reconciliationStatus ENUM('pending', 'verified', 'discrepancy') DEFAULT 'pending'");
    await ensureColumn('till_management', 'reconciliationNotes', 'reconciliationNotes TEXT');
    await ensureColumn('till_management', 'reconciliationApprovedBy', 'reconciliationApprovedBy VARCHAR(255)');
    await ensureColumn('till_management', 'reconciliationApprovedAt', 'reconciliationApprovedAt DATETIME');

    // Backfill expected cash and difference for legacy closed sessions
    await query(`
      UPDATE till_management tm
      SET
        expectedCash = COALESCE(expectedCash, openingBalance + (
          SELECT COALESCE(SUM(s.total), 0)
          FROM sales s
          WHERE s.userId = tm.userId
            AND s.status = 'Completed'
            AND s.paymentMethod = 'Cash'
            AND s.date BETWEEN tm.openedAt AND COALESCE(tm.closedAt, NOW())
        )),
        difference = COALESCE(difference, closingBalance - COALESCE(expectedCash, openingBalance + (
          SELECT COALESCE(SUM(s.total), 0)
          FROM sales s
          WHERE s.userId = tm.userId
            AND s.status = 'Completed'
            AND s.paymentMethod = 'Cash'
            AND s.date BETWEEN tm.openedAt AND COALESCE(tm.closedAt, NOW())
        )))
      WHERE tm.closedAt IS NOT NULL
        AND (tm.expectedCash IS NULL OR tm.difference IS NULL)
    `);

    // Audit Logs Table
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36),
        action VARCHAR(255) NOT NULL,
        details TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id),
        INDEX idx_userId (userId),
        INDEX idx_createdAt (createdAt)
      )
    `);
    console.log('✓ Audit Logs table created');

    console.log('✓ Database initialization completed successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export { initializeDatabase };
