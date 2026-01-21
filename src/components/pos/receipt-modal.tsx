
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

interface ReceiptModalProps {
  sale: Sale;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptModal({ sale, isOpen, onClose }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [showCardReceipt, setShowCardReceipt] = useState(false);

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    // Clone node and inline computed styles so printed output matches the preview.
    const cloneWithInlineStyles = (node: HTMLElement) => {
      const clone = node.cloneNode(true) as HTMLElement;

      const walk = (source: Element, target: Element) => {
        const computed = window.getComputedStyle(source as Element);
        // Apply computed styles as inline cssText
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
    // Basic reset for print window to avoid unexpected margins
    printWindow.document.write('<style>html,body{margin:0;padding:8px;background:#fff;} @media print { body { -webkit-print-color-adjust: exact; } }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.body.appendChild(printable);
    printWindow.document.close();
    printWindow.focus();
    // Give the window a moment to render cloned nodes and styles
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      // Automatically close the modal and reset the POS after printing
      onClose();
    }, 250);
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen && !showCardReceipt} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sale Receipt</DialogTitle>
          </DialogHeader>
          
          <div className="overflow-auto max-h-[60vh]">
            <Receipt ref={receiptRef} sale={sale} />
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              New Sale
            </Button>
            {sale.cardTransactionId && (
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setShowCardReceipt(true)}
              >
                Card Receipt
              </Button>
            )}
            <Button type="button" onClick={handlePrint}>
              Print Receipt
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
