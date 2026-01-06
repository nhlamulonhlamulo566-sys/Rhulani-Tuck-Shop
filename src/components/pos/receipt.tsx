'use client';
import React from 'react';
import Barcode from 'react-barcode';
import { format } from 'date-fns';
import type { CartItem, Sale } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

export interface ReceiptData {
  saleId: string;
  date: Date;
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentMethod: Sale['paymentMethod'];
  amountPaid: number;
  change: number;
}

interface ReceiptProps {
  receiptData: ReceiptData;
}

export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(
  ({ receiptData }, ref) => {
    const {
      saleId,
      date,
      items,
      subtotal,
      taxAmount,
      total,
      paymentMethod,
      amountPaid,
      change,
    } = receiptData;

    return (
      <div ref={ref} className="p-4 bg-white text-black font-mono text-xs w-[300px] mx-auto print-receipt-container">
        <div className="text-center mb-4">
          <h1 className="text-lg font-bold">RHULANI TUCK SHOP</h1>
          <p>123 Main Street, Anytown</p>
          <p>Tel: (123) 456-7890</p>
        </div>

        <Separator className="my-2 bg-black" />

        <div className="flex justify-between mb-2">
          <span>Date: {format(date, 'yyyy-MM-dd')}</span>
          <span>Time: {format(date, 'HH:mm:ss')}</span>
        </div>
        <p className="mb-2">Receipt No: {saleId}</p>

        <Separator className="my-2 bg-black" />
        
        <table className="w-full">
            <thead>
                <tr>
                    <th className="text-left">ITEM</th>
                    <th className="text-center">QTY</th>
                    <th className="text-right">PRICE</th>
                </tr>
            </thead>
            <tbody>
            {items.map(item => (
                <tr key={item.product.id}>
                    <td className="text-left w-1/2 break-words">{item.product.name}</td>
                    <td className="text-center align-top">{item.quantity}</td>
                    <td className="text-right align-top">R{item.product.price.toFixed(2)}</td>
                </tr>
            ))}
            </tbody>
        </table>

        <Separator className="my-2 border-dashed bg-transparent border-t border-black" />

        <div className="space-y-1">
            <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>R{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
                <span>Tax:</span>
                <span>R{taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm">
                <span>Total:</span>
                <span>R{total.toFixed(2)}</span>
            </div>
        </div>

        <Separator className="my-2 border-dashed bg-transparent border-t border-black" />
        
        <div className="space-y-1">
            <div className="flex justify-between">
                <span>Payment Method:</span>
                <span>{paymentMethod}</span>
            </div>
             {paymentMethod === 'Cash' && (
                <>
                    <div className="flex justify-between">
                        <span>Amount Paid:</span>
                        <span>R{amountPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Change:</span>
                        <span>R{change.toFixed(2)}</span>
                    </div>
                </>
             )}
        </div>

        <Separator className="my-2 bg-black" />

        <div className="mt-4 text-center">
          <h2 className="font-bold uppercase">Return Policy</h2>
          <div className="text-left space-y-1 mt-1">
            <p>- Returns accepted within 1 day of purchase.</p>
            <p>- Valid receipt required for all returns.</p>
            <p>- Items must be in original, unused condition.</p>
            <p>- Refunds issued to original payment method.</p>
            <p>- Perishables or final sale items not returnable.</p>
            <p>- No returns on voided transactions.</p>
          </div>
        </div>
        
        <div className="text-center mt-6">
          <p>Thank you for your purchase!</p>
        </div>

        <div className="flex justify-center mt-4">
            <Barcode value={saleId} height={40} width={1.5} displayValue={false} />
        </div>
      </div>
    );
  }
);

Receipt.displayName = 'Receipt';
