'use client';

import * as React from 'react';
import { toMoney } from '@/lib/format-utils';
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
import { Loader2 } from 'lucide-react';
import { useCollection } from '@/hooks/use-db-collection';

function SaleRow({ sale, onSelect }: { sale: Sale; onSelect: (sale: Sale) => void }) {
  
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

  return (
    <TableRow>
      <TableCell className="font-medium max-w-24 truncate">{sale.id}</TableCell>
      <TableCell>{sale.customerName}</TableCell>
      <TableCell>{format(new Date(sale.date), 'MMMM d, yyyy')}</TableCell>
      <TableCell>
        {getStatusBadge(sale.status)}
      </TableCell>
      <TableCell>{(sale.items || []).reduce((sum, item) => sum + item.quantity, 0)}</TableCell>
      <TableCell className="text-right">R{toMoney(sale.total)}</TableCell>
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
  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(null);
  const { data: sales, isLoading } = useCollection<Sale>('/api/sales');

  React.useEffect(() => {
    const user = sessionStorage.getItem('currentUser');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  const filteredSales = React.useMemo(() => {
    if (!sales || !currentUser) return sales || [];
    
    // Admin users see all sales
    if (currentUser.role === 'Administration' || currentUser.role === 'Super Administration') {
      return sales;
    }
    // Sales users see only their own sales
    return sales.filter(sale => sale.userId === currentUser.id);
  }, [sales, currentUser]);

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
            ) : filteredSales && filteredSales.length > 0 ? (
            filteredSales.map((sale) => (
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

    