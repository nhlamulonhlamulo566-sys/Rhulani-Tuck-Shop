
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
import type { Sale } from '@/lib/types';
import { useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { shouldAutoPrint, getAutoPrintNotification } from '@/lib/receipt-printing';
import { useToast } from '@/hooks/use-toast';

interface ReceiptModalProps {
  sale: Sale;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptModal({ sale, isOpen, onClose }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Determine if auto-print should be triggered
  const autoPrintEnabled = shouldAutoPrint(
    sale.paymentMethod as 'Card' | 'Cash',
    sale.change || 0
  );

  // Show notification when auto-print is triggered
  useEffect(() => {
    if (isOpen && autoPrintEnabled) {
      const notification = getAutoPrintNotification(
        sale.paymentMethod as 'Card' | 'Cash',
        sale.change || 0
      );
      toast({
        title: notification.title,
        description: notification.description,
      });
    }
  }, [isOpen, autoPrintEnabled, sale.paymentMethod, sale.change, toast]);

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
      pdf.save(`receipt-${sale.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  if (!isOpen) return null;

  return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Sale Receipt */}
            <Receipt 
              ref={receiptRef} 
              sale={sale} 
              autoPrint={autoPrintEnabled}
              autoPrintDelay={1500}
            />

            {sale.cardTransactionId && (
              <>
                <div className="border-t border-dashed my-4"></div>
                <div className="text-center space-y-2">
                  <p className="font-bold">CARD RECEIPT</p>
                  <p className="text-sm">Transaction ID:</p>
                  <p className="font-mono text-xs font-bold">{sale.cardTransactionId}</p>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter className="flex gap-2 flex-wrap">
            <Button type="button" variant="secondary" onClick={onClose}>
              New Sale
            </Button>
            <Button type="button" variant="outline" onClick={handleDownloadPDF}>
              Download PDF
            </Button>
            <Button type="button" onClick={handlePrint}>
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
