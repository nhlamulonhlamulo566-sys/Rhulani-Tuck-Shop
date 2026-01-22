'use client';

import type { Sale } from '@/lib/types';
import { format } from 'date-fns';
import React from 'react';
import Barcode from 'react-barcode';

interface ReceiptProps {
  sale: Sale;
}

export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(({ sale }, ref) => {
  const formatCurrency = (amount: number) => `R${amount.toFixed(2)}`;
  const isVoucher = sale.transactionType === 'airtime' || sale.transactionType === 'electricity';
  const voucherTitle = sale.transactionType === 'airtime' ? 'AIRTIME VOUCHER' : sale.transactionType === 'electricity' ? 'ELECTRICITY VOUCHER' : 'RECEIPT';

  return (
    <div ref={ref} className="bg-white text-black font-mono text-xs p-4 w-[302px] mx-auto">
      <div className="text-center mb-4">
        <h1 className="font-bold text-sm">RHULANI TUCK SHOP</h1>
        <p>169 A Mphambo Village Malamulele 0982</p>
        <p>Tel: 065 975 8269</p>
      </div>

      <div className="flex justify-between mb-1">
        <span>Date: {format(new Date(sale.date), 'yyyy-MM-dd')}</span>
        <span>Time: {format(new Date(sale.date), 'HH:mm:ss')}</span>
      </div>
      <p>Ref No: {sale.id}</p>
      <p className="mb-2">Salesperson: {sale.salesperson}</p>

      {/* Voucher-specific details */}
      {isVoucher && (
        <div className="border-b border-dashed border-black pb-2 mb-2">
          <h2 className="font-bold text-center mb-1">{voucherTitle}</h2>
          {sale.transactionType === 'airtime' && (
            <>
              <div className="flex justify-between">
                <span>Network:</span>
                <span>{(sale as any).network || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Phone No:</span>
                <span>{(sale as any).phone || 'N/A'}</span>
              </div>
            </>
          )}
          {sale.transactionType === 'electricity' && (
            <>
              <div className="flex justify-between">
                <span>Municipality:</span>
                <span>{(sale as any).municipality || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Meter No:</span>
                <span>{(sale as any).meter || 'N/A'}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Items section (only for regular sales) */}
      {!isVoucher && (
        <div className="border-t border-dashed border-black pt-2 mb-2">
          <div className="flex font-bold">
            <span className="flex-grow">ITEM</span>
            <span className="w-8 text-center">QTY</span>
            <span className="w-16 text-right">PRICE</span>
          </div>
          {(sale.items || []).map((item, index) => (
              <div key={index} className="flex">
                <span className="flex-grow pr-2">{item.name}</span>
                <span className="w-8 text-center">{item.quantity}</span>
                <span className="w-16 text-right">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
        </div>
      )}
      
      <div className="border-t border-dashed border-black pt-1">
          <div className="flex justify-end">
              <div className="w-40">
                  {!isVoucher && (
                    <>
                      <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(sale.subtotal || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                          <span>Tax:</span>
                          <span>{formatCurrency(sale.tax || 0)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold">
                      <span>{isVoucher ? 'Amount' : 'Total'}:</span>
                      <span>{formatCurrency(Math.abs(sale.total))}</span>
                  </div>
              </div>
          </div>
      </div>


      <div className="border-t border-dashed border-black pt-1 mt-1">
          <div className="flex justify-between">
              <span>Payment Method:</span>
              <span>{sale.paymentMethod}</span>
          </div>
          {sale.paymentMethod === 'Cash' && !isVoucher && (
              <>
              <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(sale.amountPaid || 0)}</span>
              </div>
              <div className="flex justify-between">
                  <span>Change:</span>
                  <span>{formatCurrency(sale.change || 0)}</span>
              </div>
              </>
          )}
      </div>

      {!isVoucher && (
        <div className="pt-2 mt-4 text-center">
          <h2 className="font-bold mb-1">RETURN POLICY</h2>
          <ul className="text-left list-disc list-inside space-y-1 text-[10px] leading-tight">
            <li>Returns accepted within 1 day of purchase.</li>
            <li>Valid receipt required for all returns.</li>
            <li>Items must be in original, unused condition.</li>
            <li>Refunds issued to original payment method.</li>
            <li>Perishables or final sale items not returnable.</li>
            <li>No returns on voided transactions.</li>
          </ul>
        </div>
      )}

      <p className="text-center my-4">{isVoucher ? 'Voucher has been purchased successfully!' : 'Thank you for your purchase!'}</p>

      <div className="flex justify-center">
        <Barcode value={sale.id} height={40} width={1.5} fontSize={10} />
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';
