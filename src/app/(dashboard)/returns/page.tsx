'use client';

import { useState } from 'react';
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
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, getDoc, runTransaction, arrayUnion } from 'firebase/firestore';
import { ReturnItemsDialog } from '@/components/returns/return-items-dialog';
import { PinAuthDialog } from '@/components/auth/pin-auth-dialog';


function TransactionDetails({ sale, onClear, onSaleUpdate }: { sale: Sale; onClear: () => void; onSaleUpdate: (updatedSale: Sale) => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'void' | 'return' | null>(null);
  const [authorizingAdmin, setAuthorizingAdmin] = useState<UserProfile | null>(null);

  const handleVoid = async (admin: UserProfile) => {
    if (sale.status !== 'Completed') {
      toast({ title: 'Invalid Action', description: 'This transaction cannot be voided.' });
      return;
    }
    const saleRef = doc(firestore, `sales`, sale.id);
    const updatedSale: Sale = {
        ...sale,
        status: 'Voided',
        authorizations: [
            ...(sale.authorizations || []),
            {
                userId: admin.id,
                userName: `${admin.firstName} ${admin.lastName}`,
                timestamp: new Date().toISOString(),
                action: 'void',
                details: 'Full transaction voided',
            }
        ]
    };
    
    // Use transaction to ensure stock and sale are updated together
    try {
        if (!sale.items) {
            toast({
                variant: 'destructive',
                title: 'Invalid Sale',
                description: 'Cannot return items from this transaction.',
            });
            return;
        }

        await runTransaction(firestore, async (transaction) => {
            const itemsToReturn = (sale.items || []).map(i => ({ productId: i.productId, quantity: i.quantity - (i.returnedQuantity || 0) })).filter(i => i.quantity > 0);
            if (itemsToReturn.length > 0) {
                 const productRefs = itemsToReturn.map(item => doc(firestore, 'products', item.productId));
                 const productSnaps = await Promise.all(productRefs.map(ref => transaction.get(ref)));

                 productSnaps.forEach((productSnap, index) => {
                    if (productSnap.exists()) {
                        const product = productSnap.data() as Product;
                        const item = itemsToReturn[index];
                        const newStock = product.stock + item.quantity;
                        transaction.update(productSnap.ref, { stock: newStock });
                    }
                });
            }
            transaction.update(saleRef, { status: updatedSale.status, authorizations: updatedSale.authorizations });
        });

        toast({
            title: "Transaction Voided",
            description: `Sale ID: ${sale.id} has been voided. Stock updated.`,
        });
        onSaleUpdate(updatedSale);

    } catch (e) {
        console.error("Void transaction failed:", e);
        toast({ variant: "destructive", title: "Void Failed", description: "Could not void transaction or update stock." });
    }
  }

  const handleProcessPartialReturn = async (returnedItems: { productId: string; quantity: number }[], admin: UserProfile) => {
     if (returnedItems.length === 0) {
      toast({ variant: 'destructive', title: 'No Items Selected', description: 'Please select items and quantities to return.' });
      return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const saleRef = doc(firestore, `sales`, sale.id);
            const saleSnap = await transaction.get(saleRef);
            if (!saleSnap.exists()) {
                throw new Error("Sale not found");
            }
            const currentSale = saleSnap.data() as Sale;

            // 1. Update stock levels for returned items
            const productRefs = returnedItems.map(item => doc(firestore, 'products', item.productId));
            const productSnaps = await Promise.all(productRefs.map(ref => transaction.get(ref)));

            productSnaps.forEach((productSnap, index) => {
                if (productSnap.exists()) {
                    const product = productSnap.data() as Product;
                    const item = returnedItems[index];
                    const newStock = product.stock + item.quantity;
                    transaction.update(productSnap.ref, { stock: newStock });
                }
            });

            // 2. Prepare updated sale data
            const updatedItems = (currentSale.items || []).map(item => {
                const returned = returnedItems.find(r => r.productId === item.productId);
                return returned ? { ...item, returnedQuantity: (item.returnedQuantity || 0) + returned.quantity } : item;
            });

            const totalPurchased = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
            const totalReturned = updatedItems.reduce((sum, item) => sum + (item.returnedQuantity || 0), 0);
            const newStatus: Sale['status'] = totalReturned >= totalPurchased ? 'Returned' : 'Partially Returned';

            const returnDetails = returnedItems.map(ri => `${ri.quantity} x ${(currentSale.items || []).find(i => i.productId === ri.productId)?.name}`).join(', ');

            const updatedAuthorizations = [
                ...(currentSale.authorizations || []),
                {
                    userId: admin.id,
                    userName: `${admin.firstName} ${admin.lastName}`,
                    timestamp: new Date().toISOString(),
                    action: 'return' as const,
                    details: `Returned: ${returnDetails}`,
                }
            ];
            
            // 3. Update the sale document within the transaction
            transaction.update(saleRef, { items: updatedItems, status: newStatus, authorizations: updatedAuthorizations });
            onSaleUpdate({ ...currentSale, items: updatedItems, status: newStatus, authorizations: updatedAuthorizations });
        });
        
        toast({ title: "Return Processed", description: `Stock and sale record have been updated.` });

    } catch (e: any) {
        console.error("Return processing failed:", e);
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
              <p className="font-bold text-lg">R{sale.total.toFixed(2)}</p>
            </div>
          </div>
          <Separator />
          <div>
              <h4 className="font-medium mb-2">Items</h4>
              <div className="space-y-2">
              {(sale.items || []).map((item, index) => {
                  return (
                      <div key={index} className="flex justify-between items-center text-sm">
                          <p>
                            {item.name || 'Unknown Product'} (x{item.quantity})
                             {item.returnedQuantity && item.returnedQuantity > 0 && 
                                <span className="text-xs text-destructive ml-2">
                                  (-{item.returnedQuantity} returned)
                                </span>
                             }
                          </p>
                          <p className="font-mono">R{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                  )
              })}
              </div>
          </div>
        </CardContent>
        <CardFooter className="gap-4">
          <Button className="w-full" onClick={() => { setPendingAction('return'); setIsPinDialogOpen(true); }} disabled={isActionDisabled}>Process Return for Items</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button className="w-full" variant="destructive" disabled={sale.status !== 'Completed'}>Void Full Transaction</Button>
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
                    <AlertDialogAction onClick={() => { setPendingAction('void'); setIsPinDialogOpen(true); }}>Authorize & Void</AlertDialogAction>
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
            onConfirm={(returnedItems) => {
                handleProcessPartialReturn(returnedItems, authorizingAdmin);
            }}
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
  const firestore = useFirestore();

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
        const saleRef = doc(firestore, `sales`, saleId);
        const saleSnap = await getDoc(saleRef);

        if (saleSnap.exists()) {
            setFoundSale({ id: saleSnap.id, ...saleSnap.data() } as Sale);
            setSaleId(''); // Clear the input field after finding sale
        } else {
            toast({
                variant: 'destructive',
                title: 'Sale not found',
                description: `No sale found with ID: ${saleId}`,
            });
            setSaleId(''); // Clear the input field even if not found
        }
    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Error finding sale',
            description: 'There was a problem searching for the transaction.',
        });
        setSaleId(''); // Clear the input field on error
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleClear = () => {
    setFoundSale(null);
    setSaleId('');
  }
  
  const handleSaleUpdate = (updatedSale: Sale) => {
    setFoundSale(updatedSale);
  }

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
                  onKeyDown={(e) => e.key === 'Enter' && handleFindSale()}
                  disabled={isLoading}
                />
              </div>
              <Button onClick={handleFindSale} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find Sale"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {foundSale && <TransactionDetails sale={foundSale} onClear={handleClear} onSaleUpdate={handleSaleUpdate} />}

        <Card>
          <CardHeader>
            <CardTitle>Return Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Returns are accepted within 1 days of the original purchase date.</li>
              <li>A valid receipt or sale ID is required for all returns and exchanges.</li>
              <li>Returned items must be in their original, unused condition with all tags and packaging intact.</li>
              <li>Refunds will be issued to the original form of payment. Cash sales will be refunded with cash.</li>
              <li>Certain items, such as perishables or final sale items, may not be eligible for return.</li>
              <li>Voided transactions cannot be returned.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
