'use client';

import { useState } from 'react';
import { toMoney } from '@/lib/format-utils';
import PageHeader from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Barcode, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Sale, Product, SaleItem, UserProfile } from '@/lib/types';
import { format } from 'date-fns';
import { ReturnItemsDialog } from '@/components/returns/return-items-dialog';
import { PinAuthDialog } from '@/components/auth/pin-auth-dialog';

function TransactionDetails({ sale, onClear, onSaleUpdate }: { sale: Sale; onClear: () => void; onSaleUpdate: (updatedSale: Sale) => void }) {
  const { toast } = useToast();
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'void' | 'return' | null>(null);
  const [authorizingAdmin, setAuthorizingAdmin] = useState<UserProfile | null>(null);

  const handleVoid = async (admin: UserProfile) => {
    if (sale.status !== 'Completed') {
      toast({ title: 'Invalid Action', description: 'This transaction cannot be voided.' });
      return;
    }

    try {
      const response = await fetch(`/api/sales/${sale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Voided' }),
      });

      if (!response.ok) throw new Error('Failed to void sale');

      if (sale.items) {
        for (const item of sale.items) {
          const restockQty = item.quantity - (item.returnedQuantity || 0);
          if (restockQty > 0) {
            // Fetch current product stock
            const productResponse = await fetch(`/api/products/${item.productId}`);
            if (productResponse.ok) {
              const product = await productResponse.json();
              await fetch(`/api/products/${item.productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  stock: product.stock + restockQty,
                }),
              });
            }
          }
        }
      }

      toast({
        title: 'Sale Voided',
        description: 'Transaction has been successfully voided and inventory updated.',
      });

      const updatedSale: Sale = { ...sale, status: 'Voided' };
      onSaleUpdate(updatedSale);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const handleProcessPartialReturn = async (returnedItems: { productId: string; quantity: number }[], admin: UserProfile) => {
    if (returnedItems.length === 0) {
      toast({ variant: 'destructive', title: 'No Items Selected', description: 'Please select items and quantities to return.' });
      return;
    }

    try {
      const response = await fetch(`/api/returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: sale.id,
          returnedItems,
          adminId: admin.id,
          adminName: `${admin.firstName} ${admin.lastName}`,
        }),
      });

      if (!response.ok) throw new Error('Failed to process return');

      const updatedSale = await response.json();
      onSaleUpdate(updatedSale);
      setIsReturnDialogOpen(false);
      toast({ title: "Return Processed", description: `Stock and sale record have been updated.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Return Failed", description: e.message || "Could not process the return." });
    }
  };

  const handlePinSuccess = (admin: UserProfile) => {
    if (pendingAction === 'void') {
      handleVoid(admin);
    } else if (pendingAction === 'return') {
      setAuthorizingAdmin(admin);
      setIsReturnDialogOpen(true);
    }
    setPendingAction(null);
  };

  const getStatusBadge = (status: Sale['status']) => {
    switch (status) {
      case 'Voided':
      case 'Returned':
        return <Badge variant="destructive">{status}</Badge>;
      case 'Partially Returned':
        return <Badge variant="secondary">{status}</Badge>;
      case 'Completed':
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const isActionDisabled = sale.status === 'Voided' || sale.status === 'Returned';

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>Sale ID: {sale.id}</CardDescription>
          </div>
          <Button variant="ghost" onClick={onClear}>Clear</Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">Date</p>
              <p className="text-muted-foreground">{format(new Date(sale.date), 'PPpp')}</p>
            </div>
            <div>
              <div className="font-medium">Payment Method</div>
              <Badge variant="secondary">{sale.paymentMethod}</Badge>
            </div>
            <div>
              <div className="font-medium">Status</div>
              {getStatusBadge(sale.status)}
            </div>
            <div className="md:text-right">
              <p className="font-medium">Total</p>
              <p className="font-bold text-lg">R{toMoney(sale.total)}</p>
            </div>
          </div>
          <Separator />
          <div>
            <h4 className="font-medium mb-2">Items</h4>
            <div className="space-y-2">
              {(sale.items || []).map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <p>
                    {item.name || 'Unknown Product'} (x{item.quantity})
                    {item.returnedQuantity && item.returnedQuantity > 0 && (
                      <span className="text-xs text-destructive ml-2">
                        (-{item.returnedQuantity} returned)
                      </span>
                    )}
                  </p>
                  <p className="font-mono">R{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="gap-4">
          <Button
            className="w-full"
            onClick={() => { setPendingAction('return'); setIsPinDialogOpen(true); }}
            disabled={isActionDisabled}
          >
            Process Return for Items
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full" variant="destructive" disabled={sale.status !== 'Completed'}>
                Void Full Transaction
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will void the entire transaction and attempt to return all items to stock. Admin authorization is required.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { setPendingAction('void'); setIsPinDialogOpen(true); }}>
                  Authorize & Void
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
      <PinAuthDialog
        open={isPinDialogOpen}
        onOpenChange={setIsPinDialogOpen}
        onSuccess={handlePinSuccess}
      />
      {authorizingAdmin && (
        <ReturnItemsDialog
          isOpen={isReturnDialogOpen}
          onClose={() => { setIsReturnDialogOpen(false); setAuthorizingAdmin(null); }}
          sale={sale}
          onConfirm={(returnedItems) => handleProcessPartialReturn(returnedItems, authorizingAdmin)}
        />
      )}
    </>
  );
}

export default function ReturnsPage() {
  const [saleId, setSaleId] = useState('');
  const [foundSale, setFoundSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFindSale = async () => {
    if (!saleId) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please enter a Sale ID.',
      });
      return;
    }
    setIsLoading(true);
    setFoundSale(null);

    try {
      const response = await fetch(`/api/sales/${saleId}`);
      if (response.ok) {
        const sale = await response.json();
        setFoundSale(sale);
        setSaleId('');
      } else {
        toast({
          variant: 'destructive',
          title: 'Sale not found',
          description: `No sale found with ID: ${saleId}`,
        });
        setSaleId('');
      }
    } catch (error) {
      console.error('Error finding sale:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to find sale. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setFoundSale(null);
    setSaleId('');
  };

  const handleSaleUpdate = (updatedSale: Sale) => {
    setFoundSale(updatedSale);
  };

  return (
    <>
      <PageHeader title="Void & Returns" />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Find a Transaction</CardTitle>
            <CardDescription>
              Scan a receipt barcode or manually enter a sale ID to find a transaction.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Scan or enter Sale ID..."
                  className="pl-10"
                  value={saleId}
                  onChange={(e) => setSaleId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleFindSale()}
                />
              </div>
              <Button onClick={handleFindSale} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {foundSale && (
          <TransactionDetails
            sale={foundSale}
            onClear={handleClear}
            onSaleUpdate={handleSaleUpdate}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Return Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>Returns must be processed within 30 days of purchase.</li>
              <li>Items must be in original condition with receipt.</li>
              <li>Certain items, such as perishables or final sale items, may not be eligible for return.</li>
              <li>Voided transactions cannot be returned.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}