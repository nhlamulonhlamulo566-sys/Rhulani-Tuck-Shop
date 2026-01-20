import type { Product, Sale, UserProfile } from './types';
import { PlaceHolderImages } from './placeholder-images';

// This file is now deprecated as we are using live Firebase data.
// It is kept for reference and potential fallback, but is not actively used in the application.

const getImage = (id: string) => {
  const image = PlaceHolderImages.find(img => img.id === id);
  return image ? { url: image.imageUrl, hint: image.imageHint } : { url: 'https://picsum.photos/seed/default/600/400', hint: 'placeholder' };
};

export const mockUser: UserProfile = {
  id: 'user-1',
  firstName: 'Alex',
  lastName: 'Doe',
  email: 'alex.doe@example.com',
  role: 'Administration',
  createdAt: new Date().toISOString(),
};

export const mockProducts: Product[] = [
  { id: 'prod-1', name: 'Wireless Headphones', category: 'Electronics', price: 99.99, stock: 120, lowStockThreshold: 20, description: 'High-fidelity sound, 24-hour battery life.', imageUrl: getImage('prod-1').url, imageHint: getImage('prod-1').hint, barcode: '123456789012', barcodePack: '123456789012-6', packSize: 6, barcodeCase: '123456789012-24', caseSize: 24 },
  { id: 'prod-2', name: 'Smartwatch', category: 'Electronics', price: 199.99, stock: 75, lowStockThreshold: 15, description: 'Track your fitness, notifications on your wrist.', imageUrl: getImage('prod-2').url, imageHint: getImage('prod-2').hint, barcode: '123456789013', barcodePack: '123456789013-6', packSize: 6, barcodeCase: '123456789013-24', caseSize: 24 },
  { id: 'prod-3', name: 'Laptop Pro', category: 'Electronics', price: 1299.99, stock: 30, lowStockThreshold: 10, description: 'Powerful, lightweight, and perfect for professionals.', imageUrl: getImage('prod-3').url, imageHint: getImage('prod-3').hint, barcode: '123456789014', barcodePack: '123456789014-6', packSize: 6, barcodeCase: '123456789014-24', caseSize: 24 },
  { id: 'prod-4', name: 'Digital Camera', category: 'Electronics', price: 499.99, stock: 45, lowStockThreshold: 15, description: 'Capture stunning photos with 24MP sensor.', imageUrl: getImage('prod-4').url, imageHint: getImage('prod-4').hint, barcode: '123456789015', barcodePack: '123456789015-6', packSize: 6, barcodeCase: '123456789015-24', caseSize: 24 },
  { id: 'prod-5', name: 'Ergonomic Chair', category: 'Furniture', price: 249.99, stock: 40, lowStockThreshold: 10, description: 'All-day comfort and support for your back.', imageUrl: getImage('prod-5').url, imageHint: getImage('prod-5').hint, barcode: '123456789016', barcodePack: '123456789016-6', packSize: 6, barcodeCase: '123456789016-24', caseSize: 24 },
  { id: 'prod-6', name: 'Wooden Desk', category: 'Furniture', price: 399.99, stock: 25, lowStockThreshold: 5, description: 'Solid oak desk with a minimalist design.', imageUrl: getImage('prod-6').url, imageHint: getImage('prod-6').hint, barcode: '123456789017', barcodePack: '123456789017-6', packSize: 6, barcodeCase: '123456789017-24', caseSize: 24 },
  { id: 'prod-7', name: 'Ceramic Mug Set', category: 'Homeware', price: 39.99, stock: 200, lowStockThreshold: 50, description: 'Set of 4 stylish mugs, perfect for coffee lovers.', imageUrl: getImage('prod-7').url, imageHint: getImage('prod-7').hint, barcode: '123456789018', barcodePack: '123456789018-6', packSize: 6, barcodeCase: '123456789018-24', caseSize: 24 },
  { id: 'prod-8', name: 'Indoor Plant', category: 'Homeware', price: 29.99, stock: 150, lowStockThreshold: 30, description: 'Low-maintenance plant to brighten up your space.', imageUrl: getImage('prod-8').url, imageHint: getImage('prod-8').hint, barcode: '123456789019', barcodePack: '123456789019-6', packSize: 6, barcodeCase: '123456789019-24', caseSize: 24 },
  { id: 'prod-9', name: 'Leather Notebook', category: 'Stationery', price: 24.99, stock: 30, lowStockThreshold: 50, description: 'A5 leather-bound notebook for your thoughts.', imageUrl: getImage('prod-9').url, imageHint: getImage('prod-9').hint, barcode: '123456789020', barcodePack: '123456789020-6', packSize: 6, barcodeCase: '123456789020-24', caseSize: 24 },
  { id: 'prod-10', name: 'Bluetooth Speaker', category: 'Electronics', price: 79.99, stock: 90, lowStockThreshold: 20, description: 'Portable speaker with rich bass and clear highs.', imageUrl: getImage('prod-10').url, imageHint: getImage('prod-10').hint, barcode: '123456789021', barcodePack: '123456789021-6', packSize: 6, barcodeCase: '123456789021-24', caseSize: 24 },
];

export const mockSales: Sale[] = [
  { id: 'sale-1', date: '2024-05-20T10:30:00', total: 299.98, customerName: 'John Smith', userId: 'user-1', items: [{ productId: 'prod-1', name: 'Wireless Headphones', quantity: 1, price: 99.99 }, { productId: 'prod-2', name: 'Smartwatch', quantity: 1, price: 199.99 }], paymentMethod: 'Card', subtotal: 299.98, tax: 0, amountPaid: 299.98, change: 0, salesperson: 'Alex Doe', status: 'Completed' },
  { id: 'sale-2', date: '2024-05-19T14:00:00', total: 1299.99, customerName: 'Jane Doe', userId: 'user-1', items: [{ productId: 'prod-3', name: 'Laptop Pro', quantity: 1, price: 1299.99 }], paymentMethod: 'Card', subtotal: 1299.99, tax: 0, amountPaid: 1299.99, change: 0, salesperson: 'Alex Doe', status: 'Completed' },
  { id: 'sale-3', date: '2024-05-19T16:45:00', total: 69.98, customerName: 'Peter Jones', userId: 'user-1', items: [{ productId: 'prod-7', name: 'Ceramic Mug Set', quantity: 1, price: 39.99 }, { productId: 'prod-8', name: 'Indoor Plant', quantity: 1, price: 29.99 }], paymentMethod: 'Cash', subtotal: 69.98, tax: 0, amountPaid: 70.00, change: 0.02, salesperson: 'Alex Doe', status: 'Completed' },
  { id: 'sale-4', date: '2024-05-18T11:20:00', total: 524.98, customerName: 'Mary Brown', userId: 'user-1', items: [{ productId: 'prod-4', name: 'Digital Camera', quantity: 1, price: 499.99 }, { productId: 'prod-9', name: 'Leather Notebook', quantity: 1, price: 24.99 }], paymentMethod: 'Card', subtotal: 524.98, tax: 0, amountPaid: 524.98, change: 0, salesperson: 'Alex Doe', status: 'Completed' },
  { id: 'sale-5', date: '2024-05-17T18:05:00', total: 329.98, customerName: 'Chris Green', userId: 'user-1', items: [{ productId: 'prod-5', name: 'Ergonomic Chair', quantity: 1, price: 249.99 }, { productId: 'prod-10', name: 'Bluetooth Speaker', quantity: 1, price: 79.99 }], paymentMethod: 'Cash', subtotal: 329.98, tax: 0, amountPaid: 350.00, change: 20.02, salesperson: 'Alex Doe', status: 'Completed' },
];
