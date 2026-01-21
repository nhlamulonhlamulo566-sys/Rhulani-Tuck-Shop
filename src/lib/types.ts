export type UserProfile = {
  id: string; // Firestore Document ID
  firstName: string;
  lastName: string;
  email: string;
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
  status: 'Completed' | 'Voided' | 'Returned' | 'Partially Returned' | 'Withdrawal';
  transactionType?: 'sale' | 'withdrawal'; // To distinguish between sales and withdrawals
  withdrawalReason?: string; // Reason for withdrawal
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
    expectedCash?: number;
    countedCash?: number;
    difference?: number;
    status: 'Active' | 'Closed';
    userId: string; // The admin who started/ended the session
    userName: string;
};

    