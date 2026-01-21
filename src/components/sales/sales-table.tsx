'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/page-header';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import type { Sale, UserProfile } from '@/lib/types';
import { SaleDetailsModal } from './sale-details-modal';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

function SaleRow({ sale, onSelect }: { sale: Sale; onSelect: (sale: Sale) => void }) {
  
  const getStatusBadge = (status: Sale['status']) => {
    switch (status) {
      case 'Voided':
      case 'Returned':
        return <Badge variant="destructive">{status}</Badge>;
      case 'Withdrawal':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-900">Withdrawal</Badge>;
      case 'Partially Returned':
        return <Badge variant="secondary">{status}</Badge>;
      case 'Completed':
      default:
        return <Badge>{status || 'Completed'}</Badge>;
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium max-w-24 truncate">{sale.id}</TableCell>
      <TableCell>{sale.customerName}</TableCell>
      <TableCell>{format(new Date(sale.date), 'MMMM d, yyyy')}</TableCell>
      <TableCell>
        {getStatusBadge(sale.status)}
      </TableCell>
      <TableCell>{(sale.items || []).reduce((sum, item) => sum + item.quantity, 0)}</TableCell>
      <TableCell className="text-right">R{sale.total.toFixed(2)}</TableCell>
      <TableCell className="text-right">
        <Button variant="outline" size="sm" onClick={() => onSelect(sale)}>
          View
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function SalesTable() {
  const [selectedSale, setSelectedSale] = React.useState<Sale | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();

  const salesQuery = useMemoFirebase(
    () => {
      if (!user) return null; // Guard query until user is loaded

      const salesCollection = collection(firestore, 'sales');
      // Admin users see all sales, sorted by date.
      if (user.role === 'Administration' || user.role === 'Super Administration') {
        return query(salesCollection, orderBy('date', 'desc'));
      }
      // Sales users see only their own sales, sorted by date.
      return query(salesCollection, where('userId', '==', user.id), orderBy('date', 'desc'));
    },
    [firestore, user]
  );
  
  const { data: sales, isLoading } = useCollection<Sale>(salesQuery);

  const handleCloseModal = () => {
    setSelectedSale(null);
  };

  return (
    <>
      <PageHeader title="Sales History" />
      <div className="border shadow-sm rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sale ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                </TableCell>
              </TableRow>
            ) : sales && sales.length > 0 ? (
            sales.map((sale) => (
              <SaleRow key={sale.id} sale={sale} onSelect={setSelectedSale} />
            ))) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  No sales found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <SaleDetailsModal
        sale={selectedSale}
        isOpen={!!selectedSale}
        onClose={handleCloseModal}
      />
    </>
  );
}

    