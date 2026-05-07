'use client';

import type { Sale } from '@/lib/types';
import { format } from 'date-fns';
import React, { useEffect } from 'react';
import Barcode from 'react-barcode';
import { triggerAutoPrint } from '@/lib/receipt-printing';

interface ReceiptProps {
  sale: Sale;
  autoPrint?: boolean;
  autoPrintDelay?: number;
}

export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(
  ({ sale, autoPrint = false, autoPrintDelay = 1500 }, ref) => {
    // Trigger auto-print when component mounts if enabled
    useEffect(() => {
      if (autoPrint && ref && typeof ref !== 'function' && ref.current) {
        triggerAutoPrint(ref.current, autoPrintDelay);
      }
    }, [autoPrint, autoPrintDelay, ref]);

  const formatCurrency = (amount: any): string => {
    if (amount === null || amount === undefined) return 'R0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return 'R0.00';
    return `R${num.toFixed(2)}`;
  };

  // Safely format the date, handling both string and Date formats
  const getFormattedDate = () => {
    try {
      const date = typeof sale.date === 'string' ? new Date(sale.date) : sale.date;
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      return format(date, 'yyyy-MM-dd');
    } catch {
      return 'N/A';
    }
  };

  const getFormattedTime = () => {
    try {
      const date = typeof sale.date === 'string' ? new Date(sale.date) : sale.date;
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      return format(date, 'HH:mm:ss');
    } catch {
      return 'N/A';
    }
  };

  return (
    <div ref={ref} className="bg-white text-black font-mono text-xs p-4 w-[302px] mx-auto">
      <div className="text-center mb-4">
        <h1 className="font-bold text-sm">RHULANI TUCK SHOP</h1>
        <p>169 A Mphambo Village Malamulele 0982</p>
        <p>Tel: 065 975 8269</p>
      </div>

      <div className="flex justify-between mb-1">
        <span>Date: {getFormattedDate()}</span>
        <span>Time: {getFormattedTime()}</span>
      </div>
      <div className="flex justify-between mb-2">
        <span>Ref No: {sale.id}</span>
        <span>Salesperson: {sale.salesperson}</span>
      </div>
      {sale.status !== 'Completed' && (
        <p className="mb-2 font-bold uppercase text-[11px]">
          {sale.status} {sale.transactionType ? `(${sale.transactionType})` : ''}
        </p>
      )}

      {/* Items section */}
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
      
      <div className="border-t border-dashed border-black pt-1">
          <div className="flex justify-end">
              <div className="w-40">
                  <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(sale.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>{formatCurrency(sale.tax || 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                      <span>Total:</span>
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
          {sale.paymentMethod === 'Cash' && (
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

      {/* Transaction details section */}
      {sale.transactionType === 'voucher' && sale.voucherNumber && (
        <div className="border-t border-dashed border-black pt-2 mt-2 text-center">
          <h2 className="font-bold text-sm mb-1">VOUCHER DETAILS</h2>
          <p className="font-bold">Voucher #: {sale.voucherNumber}</p>
          <p className="text-[9px]">{sale.customerName}</p>
          {sale.withdrawalReason && (
            <p className="text-[9px]">{sale.withdrawalReason}</p>
          )}
        </div>
      )}

      {/* Transaction summary for all sales */}
      <div className="border-t border-dashed border-black pt-2 mt-2 text-center">
        <h2 className="font-bold text-sm mb-1">TRANSACTION SUMMARY</h2>
        <p className="font-bold">Ref #: {sale.id}</p>
        <p className="text-[9px]">{sale.customerName}</p>
        <p className="text-[9px]">Total: R{Number(sale.total).toFixed(2)}</p>
        {sale.paymentMethod && (
          <p className="text-[9px]">Paid by: {sale.paymentMethod}</p>
        )}
      </div>

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

      <p className="text-center my-4">Thank you for your purchase!</p>

      <div className="border-t border-dashed border-black pt-3 mt-3 text-center">
        <p className="text-[10px] mb-1 uppercase tracking-[0.08em]">
          Scan this barcode for returns or void processing
        </p>
        <div className="flex justify-center">
          <Barcode value={sale.id} height={40} width={1.5} fontSize={10} />
        </div>
        <p className="text-[9px] mt-1">Receipt ID: {sale.id}</p>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';
