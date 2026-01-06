
import { type DocumentData, type DocumentReference, type Timestamp } from 'firebase/firestore';

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'administration' | 'sales';
};

export type Product = {
  id:string;
  name: string;
  category: string;
  price: number;
  stock: number; // Total number of individual items
  lowStockThreshold: number;
  description: string;
  imageUrl: string;
  imageHint: string;
  barcodeEach: string;
  barcodePack?: string;
  barcodeCase?: string;
  packSize: number; // e.g., 6
  caseSize: number; // e.g., 24
};

export type SaleItem = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  returnedQuantity?: number; // New field to track returned items
};

export type Sale = {
  id: string;
  date: string;
  total: number;
  customerName: string;
  items: SaleItem[];
  paymentMethod: 'Card' | 'Cash' | 'Transfer';
  status: 'completed' | 'voided' | 'partially-returned';
  salespersonId: string;
  salespersonName: string;
  amountPaid?: number;
  change?: number;
};

export type CartItem = {
  product: Product;
  quantity: number;
};
