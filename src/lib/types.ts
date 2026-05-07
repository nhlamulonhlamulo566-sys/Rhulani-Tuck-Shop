export type UserProfile = {
  id: string; // Firestore Document ID
  firstName: string;
  lastName: string;
  workNumber: string;
  email?: string;
  password?: string; // Storing password directly as requested
  role: 'Administration' | 'Sales' | 'Super Administration';
  pin?: string; // 6-digit PIN for admins to authorize actions
  createdAt: string;
};

export type Product = {
  id:string;
  name:string;
  category: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  description: string;
  imageUrl: string;
  imageHint: string;
  barcode?: string;
  barcodePack?: string;
  packSize?: number;
  barcodeCase?: string;
  caseSize?: number;
};

export type SaleItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  returnedQuantity?: number; // New field to track returns
};

export type Sale = {
  id: string;
  date: string;
  total: number;
  customerName: string;
  userId: string;
  items?: SaleItem[]; // Optional for withdrawal transactions
  paymentMethod?: 'Card' | 'Cash' | 'Transfer'; // Optional for withdrawal
  subtotal?: number; // Optional for withdrawal
  tax?: number; // Optional for withdrawal
  amountPaid?: number; // Optional for withdrawal
  change?: number; // Optional for withdrawal
  salesperson: string;
  status: 'Completed' | 'Voided' | 'Returned' | 'Partially Returned';
  transactionType?: 'sale' | 'voucher' | 'withdrawal' | 'void' | 'return'; // Transaction types including withdrawals, voids, and returns
  withdrawalReason?: string; // Reason for withdrawal (kept for historical data compatibility)
  voucherNumber?: string; // Auto-generated unique voucher identifier (VC-TIMESTAMP-RANDOM)
  cardTransactionId?: string; // Card payment transaction ID (locally generated)
  authorizations?: {
    userId: string;
    userName: string;
    timestamp: string;
    action: 'void' | 'return' | 'withdrawal';
    details: string;
  }[];
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type TillSession = {
    id: string;
    startDate: string;
    openingBalance: number;
    endDate?: string;
    closingBalance?: number; // Sales person must enter this
    expectedCash?: number; // Opening balance + sales - withdrawals
    countedCash?: number; // Actual cash counted
    difference?: number; // Difference between expected and counted
    status: 'Active' | 'Closed';
    userId: string; // The sales person or admin
    userName: string;
    reconciled?: boolean; // Whether balance matches
    startedBy?: string; // Admin who opened the till
    closedBy?: string; // Admin who closed the till (same admin must also open and close)
    transactions?: Array<{
        type: 'sale' | 'withdrawal' | 'void' | 'return';
        amount: number;
        timestamp: string;
    }>;
};

export type SalesShift = {
    id: string;
    userId: string;
    userName: string;
    date: string;
    startTime: string;
    endTime?: string;
    openingBalance: number;
    closingBalance?: number; // Sales person enters at end of shift
    totalSales: number; // Sum of all completed sales
    totalWithdrawals: number; // Sum of all withdrawals
    totalVoids: number; // Sum of voided sales
    totalReturns: number; // Sum of returned items
    expectedBalance?: number; // Opening + Sales - Withdrawals - Voids - Returns
    actualBalance?: number; // What sales person reports
    difference?: number; // Discrepancy between expected and actual
    status: 'Open' | 'Closed';
    reconciled: boolean;
};

    