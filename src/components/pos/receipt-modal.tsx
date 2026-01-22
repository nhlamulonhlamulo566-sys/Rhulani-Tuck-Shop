
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Receipt } from './receipt';
import { CardReceipt } from './card-receipt';
import type { Sale } from '@/lib/types';
import { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReceiptModalProps {
  sale: Sale;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptModal({ sale, isOpen, onClose }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [showCardReceipt, setShowCardReceipt] = useState(false);

  const isVoucher = sale.transactionType === 'airtime' || sale.transactionType === 'electricity';
  const voucherTitle = sale.transactionType === 'airtime' ? 'Airtime Voucher' : sale.transactionType === 'electricity' ? 'Electricity Voucher' : 'Receipt';

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const cloneWithInlineStyles = (node: HTMLElement) => {
      const clone = node.cloneNode(true) as HTMLElement;

      const walk = (source: Element, target: Element) => {
        const computed = window.getComputedStyle(source as Element);
        (target as HTMLElement).style.cssText = computed.cssText;

        const sourceChildren = Array.from(source.children || []);
        const targetChildren = Array.from(target.children || []);
        for (let i = 0; i < sourceChildren.length; i++) {
          walk(sourceChildren[i], targetChildren[i]);
        }
      };

      walk(node, clone);
      return clone;
    };

    const printable = cloneWithInlineStyles(printContent);

    const printWindow = window.open('', '', 'height=800,width=600');
    if (!printWindow) return;

    printWindow.document.write('<!doctype html><html><head><title>Print Receipt</title>');
    printWindow.document.write('<style>html,body{margin:0;padding:8px;background:#fff;} @media print { body { -webkit-print-color-adjust: exact; } }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.body.appendChild(printable);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      onClose();
    }, 250);
  };

  const handleDownloadPDF = async () => {
    const element = receiptRef.current;
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${isVoucher ? voucherTitle : 'receipt'}-${sale.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen && !showCardReceipt} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isVoucher ? voucherTitle : 'Sale Receipt'}</DialogTitle>
          </DialogHeader>
          
          <div className="overflow-auto max-h-[60vh]">
            <Receipt ref={receiptRef} sale={sale} />
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {isVoucher ? 'Done' : 'New Sale'}
            </Button>
            {sale.cardTransactionId && !isVoucher && (
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setShowCardReceipt(true)}
              >
                Card Receipt
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleDownloadPDF}>
              Download PDF
            </Button>
            <Button type="button" onClick={handlePrint}>
              Print {isVoucher ? 'Voucher' : 'Receipt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Receipt Modal */}
      <CardReceipt
        transaction={sale}
        isOpen={showCardReceipt && !!sale.cardTransactionId}
        onClose={() => {
          setShowCardReceipt(false);
          onClose();
        }}
      />
    </>
  );
}
