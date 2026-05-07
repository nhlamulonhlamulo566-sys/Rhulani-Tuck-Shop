-- Database Migration: Add Till Authorization and Reconciliation Fields
-- This script updates the till_management table to support PIN authorization tracking
-- and balance reconciliation workflows

-- Update sales table to add missing transaction types
ALTER TABLE sales 
MODIFY COLUMN transactionType ENUM('sale', 'withdrawal', 'voucher', 'void', 'return') DEFAULT 'sale';

-- Alter till_management table to add new fields if they don't exist
ALTER TABLE till_management 
ADD COLUMN IF NOT EXISTS startedBy VARCHAR(255),
ADD COLUMN IF NOT EXISTS closedBy VARCHAR(255),
ADD COLUMN IF NOT EXISTS reconciliationNotes TEXT,
ADD COLUMN IF NOT EXISTS reconciliationStatus ENUM('pending', 'verified', 'discrepancy') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS reconciliationApprovedBy VARCHAR(255),
ADD COLUMN IF NOT EXISTS reconciliationApprovedAt DATETIME,
ADD COLUMN IF NOT EXISTS difference DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS varianceReason TEXT;

-- Add indexes for better query performance
ALTER TABLE till_management 
ADD INDEX IF NOT EXISTS idx_reconciliationStatus (reconciliationStatus),
ADD INDEX IF NOT EXISTS idx_startedBy (startedBy),
ADD INDEX IF NOT EXISTS idx_closedBy (closedBy),
ADD INDEX IF NOT EXISTS idx_reconciliationApprovedAt (reconciliationApprovedAt);

-- Create a new table for transaction audit log
CREATE TABLE IF NOT EXISTS transaction_audit_log (
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
);

-- Create a reconciliation history table to track approval changes
CREATE TABLE IF NOT EXISTS reconciliation_history (
  id VARCHAR(36) PRIMARY KEY,
  tillSessionId VARCHAR(36) NOT NULL,
  previousStatus ENUM('pending', 'verified', 'discrepancy'),
  newStatus ENUM('pending', 'verified', 'discrepancy') NOT NULL,
  approvedBy VARCHAR(255),
  approvalNotes TEXT,
  approvalTimestamp DATETIME NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tillSessionId) REFERENCES till_management(id) ON DELETE CASCADE,
  INDEX idx_tillSessionId (tillSessionId),
  INDEX idx_approvalTimestamp (approvalTimestamp)
);

-- Add a stored procedure to calculate till balance summary
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS GetTillBalanceSummary(
  IN p_tillSessionId VARCHAR(36)
)
BEGIN
  SELECT 
    tm.id,
    tm.openingBalance,
    COALESCE(SUM(CASE WHEN sal.transactionType = 'sale' THEN sal.total ELSE 0 END), 0) as totalSales,
    COALESCE(SUM(CASE WHEN sal.transactionType = 'withdrawal' THEN sal.total ELSE 0 END), 0) as totalWithdrawals,
    COALESCE(SUM(CASE WHEN sal.transactionType = 'void' THEN sal.total ELSE 0 END), 0) as totalVoids,
    COALESCE(SUM(CASE WHEN sal.transactionType = 'return' THEN sal.total ELSE 0 END), 0) as totalReturns,
    (tm.openingBalance 
      + COALESCE(SUM(CASE WHEN sal.transactionType = 'sale' THEN sal.total ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN sal.transactionType = 'withdrawal' THEN sal.total ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN sal.transactionType = 'void' THEN sal.total ELSE 0 END), 0)
      + COALESCE(SUM(CASE WHEN sal.transactionType = 'return' THEN sal.total ELSE 0 END), 0)
    ) as expectedBalance,
    tm.closingBalance,
    (tm.closingBalance - (
      tm.openingBalance 
      + COALESCE(SUM(CASE WHEN sal.transactionType = 'sale' THEN sal.total ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN sal.transactionType = 'withdrawal' THEN sal.total ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN sal.transactionType = 'void' THEN sal.total ELSE 0 END), 0)
      + COALESCE(SUM(CASE WHEN sal.transactionType = 'return' THEN sal.total ELSE 0 END), 0)
    )) as difference,
    tm.reconciliationStatus
  FROM till_management tm
  LEFT JOIN sales sal ON sal.userId = tm.userId 
    AND sal.date >= tm.openedAt 
    AND sal.date <= COALESCE(tm.closedAt, NOW())
  WHERE tm.id = p_tillSessionId
  GROUP BY tm.id;
END$$

DELIMITER ;

-- Run this query to verify migration success:
-- SELECT * FROM till_management LIMIT 1;
-- SELECT * FROM transaction_audit_log LIMIT 1;
-- SELECT * FROM reconciliation_history LIMIT 1;
