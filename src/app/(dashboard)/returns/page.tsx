'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser, useFirestore } from '@/firebase';
import type { Sale } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Barcode, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { voidTransactionAction } from './actions';
import { ReturnItemsDialog } from '@/components/returns/return-items-dialog';

export default function ReturnsPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [saleIdInput, setSaleIdInput] = useState('');
  const [foundSale, setFoundSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiding, startVoidTransition] = useTransition();
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);
  
  const fetchSale = async (id: string) => {
     if (!firestore || !id) return;
      setIsLoading(true);
      setFoundSale(null);

      try {
        const saleRef = doc(firestore, 'sales', id.trim());
        const saleSnap = await getDoc(saleRef);

        if (saleSnap.exists()) {
          const saleData = { id: saleSnap.id, ...saleSnap.data() } as Sale;
          setFoundSale(saleData);
          toast({
            title: 'Sale Found',
            description: `Displaying details for sale ID: ${id}`,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Sale Not Found',
            description: `No sale found with the ID: ${id}`,
          });
        }
      } catch (error) {
        console.error('Error fetching sale:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch sale details.',
        });
      } finally {
        setIsLoading(false);
      }
  }

  const handleFindSaleById = async (id: string) => {
    await fetchSale(id);
    setSaleIdInput('');
  };

  const handleBarcodeScan = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const saleId = event.currentTarget.value;
      handleFindSaleById(saleId);
    }
  };
  
  const handleClear = () => {
    setFoundSale(null);
    setSaleIdInput('');
  }

  const handleVoidTransaction = () => {
    if (!foundSale) return;

    startVoidTransition(async () => {
        const result = await voidTransactionAction(foundSale.id);
        if (result.success) {
            toast({
                title: 'Transaction Voided',
                description: 'The sale has been voided and stock levels have been updated.'
            });
            // Refresh sale data
            await fetchSale(foundSale.id);
        } else {
            toast({
                variant: 'destructive',
                title: 'Voiding Failed',
                description: result.error || 'An unexpected error occurred.',
            });
        }
    });
  }

  const getStatusBadgeVariant = (status: Sale['status']) => {
    switch (status) {
        case 'voided':
            return 'destructive';
        case 'partially-returned':
            return 'secondary';
        case 'completed':
        default:
            return 'default';
    }
  }

  if (userLoading || !user) {
    return null; // or a loading spinner
  }

  return (
    <>
      <PageHeader title="Void & Returns" />
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Find a Transaction</CardTitle>
            <CardDescription>
              Scan a receipt barcode or manually enter a sale ID to find a transaction.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <div className="relative w-full flex-grow">
               <Input
                placeholder="Scan or enter Sale ID..."
                value={saleIdInput}
                onChange={(e) => setSaleIdInput(e.target.value)}
                onKeyDown={handleBarcodeScan}
                disabled={isLoading}
                className="pl-10"
              />
               <span className="absolute inset-y-0 left-0 flex items-center justify-center pl-3">
                <Barcode className="h-5 w-5 text-muted-foreground" />
              </span>
            </div>
            <Button onClick={() => handleFindSaleById(saleIdInput)} disabled={isLoading || !saleIdInput}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Find Sale'}
            </Button>
          </CardContent>
        </Card>

        {foundSale && (
          <Card className="md:col-span-2">
            <CardHeader>
              <div className='flex justify-between items-start'>
                <div>
                  <CardTitle>Transaction Details</CardTitle>
                  <CardDescription>
                    Sale ID: {foundSale.id}
                  </CardDescription>
                </div>
                 <Button variant="outline" onClick={handleClear}>Clear</Button>
              </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 sm:grid-cols-4 mb-6">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Date</p>
                        <p>{format(new Date(foundSale.date), 'PPpp')}</p>
                    </div>
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                        <div><Badge variant={foundSale.paymentMethod === 'Card' ? 'default' : 'secondary'}>{foundSale.paymentMethod}</Badge></div>
                    </div>
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <div><Badge variant={getStatusBadgeVariant(foundSale.status)} className="capitalize">{foundSale.status}</Badge></div>
                    </div>
                     <div className="text-right sm:text-left">
                        <p className="text-sm font-medium text-muted-foreground">Total</p>
                        <p className="text-lg font-bold">R{foundSale.total.toFixed(2)}</p>
                    </div>
                </div>
                <Separator className="my-4" />
                <h4 className="text-md font-semibold mb-2">Items</h4>
                <div className="space-y-2">
                    {foundSale.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                            <div>
                                {item.productName} (x{item.quantity})
                                {item.returnedQuantity && item.returnedQuantity > 0 && (
                                    <span className='ml-2 text-destructive'>
                                        (-{item.returnedQuantity} returned)
                                    </span>
                                )}
                            </div>
                            <span>R{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
                 <Separator className="my-4" />
                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                    <Button className="flex-1" onClick={() => setIsReturnDialogOpen(true)} disabled={foundSale.status === 'voided' || isVoiding}>
                        Process Return for Items
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={handleVoidTransaction} disabled={foundSale.status === 'voided' || isVoiding}>
                        {isVoiding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {foundSale.status === 'voided' ? 'Transaction Voided' : 'Void Full Transaction'}
                    </Button>
                </div>
            </CardContent>
          </Card>
        )}

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Return Policy</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              - Returns are accepted within 1 days of the original purchase
              date.
            </p>
            <p>
              - A valid receipt or sale ID is required for all returns and
              exchanges.
            </p>
            <p>
              - Returned items must be in their original, unused condition
              with all tags and packaging intact.
            </p>
            <p>
              - Refunds will be issued to the original form of payment. Cash
              sales will be refunded with cash.
            </p>
            <p>
              - Certain items, such as perishables or final sale items, may not
              be eligible for return.
            </p>
             <p>
              - Voided transactions cannot be returned.
            </p>
          </CardContent>
        </Card>
      </div>

       {foundSale && (
        <ReturnItemsDialog
            open={isReturnDialogOpen}
            onOpenChange={setIsReturnDialogOpen}
            sale={foundSale}
            onReturnSuccess={() => fetchSale(foundSale.id)}
        />
       )}
    </>
  );
}
