'use client';

import { useState } from 'react';
import type { Sale } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Printer, Download, X } from 'lucide-react';
import { formatCardReceipt } from '@/lib/card-payment';

interface CardReceiptProps {
  transaction: Sale;
  isOpen?: boolean;
  onClose?: () => void;
}

export function CardReceipt({ transaction, isOpen = true, onClose }: CardReceiptProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const formatCurrency = (amount: number) => {
    return `R${Math.abs(amount).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handlePrint = () => {
    setIsPrinting(true);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const receiptContent = getReceiptHTML();
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
        setIsPrinting(false);
      };
    }
  };

  const handleDownload = () => {
    const receiptText = formatCardReceipt(
      {
        success: transaction.status === 'Completed',
        transactionId: transaction.cardTransactionId,
        amount: transaction.total,
        currency: 'ZAR',
        timestamp: transaction.date,
        method: 'card',
      },
      'Rhulani Tuck Shop'
    );

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${transaction.cardTransactionId}.txt`;
    a.click();
  };

  const getReceiptHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${transaction.cardTransactionId}</title>
        <style>
          body { font-family: monospace; width: 80mm; margin: 0; padding: 10px; }
          .receipt { text-align: center; }
          .header { font-weight: bold; font-size: 16px; margin-bottom: 10px; }
          .line { border-bottom: 1px dashed #000; margin: 10px 0; }
          .item { display: flex; justify-content: space-between; font-size: 12px; margin: 5px 0; }
          .total { font-weight: bold; font-size: 14px; }
          .label { text-align: left; font-size: 12px; }
          @media print { body { margin: 0; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">RHULANI TUCK SHOP</div>
          <div style="font-size: 12px; margin-bottom: 10px;">CARD PAYMENT RECEIPT</div>
          
          <div class="line"></div>
          
          <div class="label">
            <div>Transaction ID:</div>
            <div style="font-weight: bold; font-family: monospace;">${transaction.cardTransactionId || 'N/A'}</div>
          </div>
          
          <div style="margin-top: 10px; font-size: 12px;">
            <div>Date: ${formatDate(transaction.date)}</div>
            <div>Salesperson: ${transaction.salesperson}</div>
            <div>Status: ${transaction.status}</div>
          </div>
          
          ${transaction.items && transaction.items.length > 0 ? `
            <div class="line"></div>
            <div style="text-align: left;">
              ${transaction.items.map(item => `
                <div class="item">
                  <div>${item.name} (${item.quantity}x)</div>
                  <div>${formatCurrency(item.price * item.quantity)}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <div class="line"></div>
          
          ${transaction.transactionType === 'withdrawal' ? `
            <div class="item total">
              <div>WITHDRAWAL AMOUNT</div>
              <div style="color: red;">${formatCurrency(transaction.total)}</div>
            </div>
            ${transaction.withdrawalReason ? `<div style="font-size: 12px; margin-top: 10px;">Reason: ${transaction.withdrawalReason}</div>` : ''}
          ` : `
            <div class="item"><div>Subtotal</div><div>${formatCurrency(transaction.subtotal || 0)}</div></div>
            ${transaction.tax ? `<div class="item"><div>Tax</div><div>${formatCurrency(transaction.tax)}</div></div>` : ''}
            <div class="line"></div>
            <div class="item total">
              <div>TOTAL</div>
              <div style="color: green;">${formatCurrency(transaction.total)}</div>
            </div>
          `}
          
          <div class="line"></div>
          <div style="font-size: 11px; margin-top: 15px;">
            <div>Payment Method: CARD</div>
            <div>Thank you for your transaction!</div>
            <div style="margin-top: 10px; color: #666;">
              For disputes contact:<br>support@rhulani-tuckshop.co.za
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Receipt</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Receipt Preview */}
          <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm space-y-2 border border-gray-200">
            <div className="text-center font-bold">RHULANI TUCK SHOP</div>
            <div className="text-center text-xs">CARD PAYMENT RECEIPT</div>
            <div className="border-t border-b border-gray-300 py-2 space-y-1">
              <div className="text-xs">
                <div>Transaction ID:</div>
                <div className="font-bold">{transaction.cardTransactionId || 'N/A'}</div>
              </div>
            </div>
            <div className="text-xs space-y-1">
              <div>Date: {formatDate(transaction.date)}</div>
              <div>Salesperson: {transaction.salesperson}</div>
              <div>Status: {transaction.status}</div>
            </div>

            {transaction.items && transaction.items.length > 0 && (
              <div className="border-t border-b border-gray-300 py-2 space-y-1">
                <div className="text-xs">
                  {transaction.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.name} ({item.quantity}x)</span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-300 pt-2 space-y-1">
              {transaction.transactionType === 'withdrawal' ? (
                <>
                  <div className="flex justify-between font-bold">
                    <span>WITHDRAWAL</span>
                    <span className="text-red-600">{formatCurrency(transaction.total)}</span>
                  </div>
                  {transaction.withdrawalReason && (
                    <div className="text-xs">Reason: {transaction.withdrawalReason}</div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between text-xs">
                    <span>Subtotal</span>
                    <span>{formatCurrency(transaction.subtotal || 0)}</span>
                  </div>
                  {transaction.tax && (
                    <div className="flex justify-between text-xs">
                      <span>Tax</span>
                      <span>{formatCurrency(transaction.tax)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-1 flex justify-between font-bold">
                    <span>TOTAL</span>
                    <span className="text-green-600">{formatCurrency(transaction.total)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-gray-300 pt-2 text-xs text-center space-y-1">
              <div>Payment: CARD</div>
              <div>Thank you!</div>
            </div>
          </div>

          {/* Action Buttons */}
          <Separator />
          <div className="flex gap-2">
            <Button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex-1 gap-2"
            >
              <Printer className="h-4 w-4" />
              {isPrinting ? 'Printing...' : 'Print'}
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full"
          >
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
