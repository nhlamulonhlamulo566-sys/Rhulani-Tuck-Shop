/**
 * Automatic Receipt Printing Utility
 * Handles auto-printing receipts for card purchases and cash with no change
 */

export interface PrintConfig {
  autoPrint: boolean;
  autoPrintDelay: number; // milliseconds before auto-print triggers
}

/**
 * Determine if receipt should auto-print
 * @param paymentMethod - 'Card' or 'Cash'
 * @param change - Amount of change for cash payments
 * @returns true if receipt should auto-print
 */
export function shouldAutoPrint(paymentMethod: 'Card' | 'Cash', change: number = 0): boolean {
  // Auto-print for all transactions
  return true;
}

/**
 * Trigger printer dialog using browser's print functionality
 * @param receiptElement - HTML element containing the receipt
 * @param delay - Delay before printing in milliseconds
 */
export function triggerAutoPrint(receiptElement: HTMLElement, delay: number = 1000): void {
  setTimeout(() => {
    if (!receiptElement) return;

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

    try {
      const printable = cloneWithInlineStyles(receiptElement);
      const printWindow = window.open('', '_blank', 'height=800,width=600');
      
      if (!printWindow) {
        console.warn('Could not open print window - pop-ups may be blocked');
        return;
      }

      printWindow.document.write('<!doctype html><html><head><title>Receipt</title>');
      printWindow.document.write('<style>');
      printWindow.document.write('html,body{margin:0;padding:8px;background:#fff;font-family:monospace;}');
      printWindow.document.write('@media print{body{-webkit-print-color-adjust:exact;color-adjust:exact;margin:0;padding:0;}}');
      printWindow.document.write('</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.body.appendChild(printable);
      printWindow.document.close();
      printWindow.focus();

      // Trigger print after content loads
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } catch (error) {
      console.error('Error triggering auto-print:', error);
    }
  }, delay);
}

/**
 * Print receipt HTML directly
 * @param htmlContent - The HTML content to print
 * @param delay - Delay before printing in milliseconds
 */
export function printReceiptHTML(htmlContent: string, delay: number = 1000): void {
  setTimeout(() => {
    try {
      const printWindow = window.open('', '_blank', 'height=800,width=600');
      
      if (!printWindow) {
        console.warn('Could not open print window - pop-ups may be blocked');
        return;
      }

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();

      // Trigger print after content loads
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } catch (error) {
      console.error('Error printing receipt:', error);
    }
  }, delay);
}

/**
 * Get printer-friendly HTML for receipt
 * @param receiptElement - The receipt element to convert
 * @returns HTML string suitable for printing
 */
export function getReceiptPrintHTML(receiptElement: HTMLElement): string {
  const clone = receiptElement.cloneNode(true) as HTMLElement;

  const walk = (source: Element, target: Element) => {
    const computed = window.getComputedStyle(source as Element);
    (target as HTMLElement).style.cssText = computed.cssText;

    const sourceChildren = Array.from(source.children || []);
    const targetChildren = Array.from(target.children || []);
    for (let i = 0; i < sourceChildren.length; i++) {
      walk(sourceChildren[i], targetChildren[i]);
    }
  };

  walk(receiptElement, clone);

  return `<!doctype html>
<html>
<head>
  <title>Receipt</title>
  <style>
    html,body{margin:0;padding:8px;background:#fff;font-family:monospace;}
    @media print{body{-webkit-print-color-adjust:exact;color-adjust:exact;margin:0;padding:0;}}
  </style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`;
}

/**
 * Format receipt for auto-print notification
 * @param paymentMethod - Payment method used
 * @param change - Change amount (for cash)
 * @returns Notification message
 */
export function getAutoPrintNotification(paymentMethod: 'Card' | 'Cash', change: number = 0): {
  title: string;
  description: string;
} {
  return {
    title: '🖨️ Receipt Printing',
    description: 'Receipt is printing automatically...',
  };
}
