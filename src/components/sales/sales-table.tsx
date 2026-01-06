
'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/page-header';
import { format } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Sale } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Separator } from '../ui/separator';

export function SalesTable() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  const salesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'sales'), orderBy('date', 'desc'));
  }, [firestore, user], 'sales-history');

  const { data: sales, isLoading } = useCollection<Sale>(salesQuery);

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  return (
    <>
      <PageHeader title="Sales History" />
      <div className="border shadow-sm rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Salesperson</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </TableCell>
                </TableRow>
            )}
            {!isLoading && sales && sales.map((sale) => (
              <TableRow key={sale.id} onClick={() => setSelectedSale(sale)} className="cursor-pointer">
                <TableCell className="font-medium">{sale.customerName}</TableCell>
                <TableCell>{sale.salespersonName}</TableCell>
                <TableCell>{format(new Date(sale.date), 'MMMM d, yyyy')}</TableCell>
                <TableCell>
                  <Badge variant={sale.paymentMethod === 'Card' ? 'default' : 'secondary'}>{sale.paymentMethod}</Badge>
                </TableCell>
                <TableCell>{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</TableCell>
                <TableCell className="text-right">R{sale.total.toFixed(2)}</TableCell>
              </TableRow>
            ))}
             {!isLoading && (!sales || sales.length === 0) && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No sales have been recorded yet.
                    </TableCell>
                </TableRow>
             )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={!!selectedSale} onOpenChange={(isOpen) => !isOpen && setSelectedSale(null)}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Sale Details</DialogTitle>
                {selectedSale && (
                  <DialogDescription>
                    Details for sale ID: {selectedSale.id}
                  </DialogDescription>
                )}
            </DialogHeader>
            {selectedSale && (
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <p className="text-muted-foreground">Date</p>
                        <p className="font-medium text-right">{format(new Date(selectedSale.date), 'PPpp')}</p>
                        <p className="text-muted-foreground">Salesperson</p>
                        <p className="font-medium text-right">{selectedSale.salespersonName}</p>
                        <p className="text-muted-foreground">Payment Method</p>
                        <p className="font-medium text-right">{selectedSale.paymentMethod}</p>
                    </div>
                    <Separator />
                    <h4 className="font-semibold">Items</h4>
                    <div className="space-y-2 text-sm max-h-64 overflow-y-auto">
                        {selectedSale.items.map((item, index) => (
                            <div key={index} className="grid grid-cols-[2fr_1fr_1fr] items-center">
                                <span>{item.productName}</span>
                                <span className="text-center text-muted-foreground">x{item.quantity}</span>
                                <span className="text-right">R{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                     <Separator />
                     <div className="grid grid-cols-2 gap-2 text-sm">
                        <p className="text-muted-foreground">Total Items</p>
                        <p className="font-medium text-right">{selectedSale.items.reduce((sum, item) => sum + item.quantity, 0)}</p>
                        <p className="font-bold text-base">Total</p>
                        <p className="font-bold text-base text-right">R{selectedSale.total.toFixed(2)}</p>
                    </div>
                    {selectedSale.paymentMethod === 'Cash' && (selectedSale.amountPaid || selectedSale.amountPaid === 0) && (
                      <>
                        <Separator />
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <p className="text-muted-foreground">Amount Paid</p>
                          <p className="font-medium text-right">R{selectedSale.amountPaid.toFixed(2)}</p>
                          <p className="text-muted-foreground">Change</p>
                          <p className="font-medium text-right">R{(selectedSale.change ?? 0).toFixed(2)}</p>
                        </div>
                      </>
                    )}
                </div>
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}
