'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { Sale } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';

interface SaleDetailsModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

const DetailRow = ({ label, value, valueComponent }: { label: string; value?: string; valueComponent?: React.ReactNode }) => (
  <div className="flex justify-between items-center text-sm">
    <p className="text-muted-foreground">{label}</p>
    {valueComponent || <p className="font-medium text-right">{value}</p>}
  </div>
);

const getStatusBadge = (status: Sale['status']) => {
    switch (status) {
      case 'Voided':
      case 'Returned':
        return <Badge variant="destructive">{status}</Badge>;
      case 'Partially Returned':
        return <Badge variant="secondary">{status}</Badge>;
      case 'Completed':
      default:
        return <Badge>{status || 'Completed'}</Badge>;
    }
  };

export function SaleDetailsModal({ sale, isOpen, onClose }: SaleDetailsModalProps) {
  if (!sale) return null;

  const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sale Details</DialogTitle>
          <DialogDescription>Details for sale ID: {sale.id}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* General Details */}
          <div className="space-y-2">
            <DetailRow label="Date" value={format(new Date(sale.date), 'MMM d, yyyy, p')} />
            <DetailRow label="Salesperson" value={sale.salesperson} />
            <DetailRow label="Payment Method" value={sale.paymentMethod} />
            <DetailRow label="Status" valueComponent={getStatusBadge(sale.status)} />
          </div>

          <Separator />

          {/* Items */}
          <div>
            <h4 className="font-medium text-sm mb-2">Items</h4>
            <div className="space-y-2">
              {sale.items.map((item, index) => {
                const isReturned = (item.returnedQuantity || 0) > 0;
                return (
                  <div key={index} className="flex justify-between items-start text-sm">
                    <div className="flex flex-col">
                      <p className="text-muted-foreground">{item.name || 'Unknown Product'}</p>
                      {isReturned && (
                        <p className="text-xs text-destructive">Returned: {item.returnedQuantity}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground w-6 text-center">x{item.quantity}</span>
                      <span className="font-medium w-16 text-right">
                        R{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />
          
          {/* Totals */}
          <div className="space-y-2">
            <DetailRow label="Total Items" value={totalItems.toString()} />
            <div className="flex justify-between items-baseline text-sm">
                <p className="text-muted-foreground">Total</p>
                <p className="font-bold text-lg">R{sale.total.toFixed(2)}</p>
            </div>
          </div>

          <Separator />

          {/* Payment */}
          <div className="space-y-2">
            <DetailRow label="Amount Paid" value={`R${sale.amountPaid.toFixed(2)}`} />
            <DetailRow label="Change" value={`R${sale.change.toFixed(2)}`} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
