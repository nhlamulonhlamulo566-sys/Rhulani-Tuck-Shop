'use client';

import { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/page-header';
import { ProductCard } from '@/components/pos/product-card';
import { PosCart } from '@/components/pos/pos-cart';
import { PinAuthDialog } from '@/components/auth/pin-auth-dialog';
import type { Product, CartItem, Sale, UserProfile, TillSession } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Barcode, Landmark, Loader2, RotateCcw, Trash2, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ReceiptModal } from '@/components/pos/receipt-modal';
import { useFirestore, useCollection, useUser, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, query, where, limit } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function PosPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const activeSessionQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'tillSessions'),
      where('status', '==', 'Active'),
      where('userId', '==', user.id),
      limit(1)
    );
  }, [firestore, user]);
  const { data: activeSessions, isLoading: sessionLoading } = useCollection<TillSession>(activeSessionQuery);
  const tillIsOpen = useMemo(() => !!activeSessions && activeSessions.length > 0, [activeSessions]);

  const productsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'products');
  }, [firestore, user]);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);

  const [cart, setCart] = useState<CartItem[]>([]);
  const { toast } = useToast();
  const [taxRate, setTaxRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card'>('Cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [pinAuthOpen, setPinAuthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'return' | 'void' | 'withdrawal' | null>(null);
  const [authorizingAdmin, setAuthorizingAdmin] = useState<UserProfile | null>(null);

  useEffect(() => {
    const savedTaxRate = localStorage.getItem('taxRate');
    if (savedTaxRate) {
      setTaxRate(parseFloat(savedTaxRate));
    }
  }, []);

  const handleTaxRateChange = (newRate: number) => {
    const rate = isNaN(newRate) ? 0 : newRate;
    setTaxRate(rate);
    localStorage.setItem('taxRate', rate.toString());
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast({
        variant: 'destructive',
        title: 'Out of Stock',
        description: `${product.name} is currently out of stock.`,
      });
      return;
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          toast({
            variant: "destructive",
            title: "Stock Limit Reached",
            description: `You cannot add more ${product.name} than is available in stock.`,
          });
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };
  
  const handleUpdateQuantity = (productId: string, quantity: number) => {
     const productInCart = cart.find(item => item.product.id === productId)?.product;
    if (productInCart && quantity > productInCart.stock) {
      toast({
        variant: "destructive",
        title: "Stock Limit Exceeded",
        description: `Only ${productInCart.stock} units of ${productInCart.name} available.`,
      });
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity: quantity } : item
      ).filter(item => item.quantity > 0)
    );
  };
  
  const handleRemoveItem = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };
  
  const handleBarcodeScan = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const barcode = event.currentTarget.value;
      const product = products?.find(p => p.barcode === barcode || p.barcodePack === barcode || p.barcodeCase === barcode);
      if (product) {
        handleAddToCart(product);
        toast({
            title: "Product Added",
            description: `${product.name} has been added to the cart.`,
        })
      } else {
        toast({
            variant: "destructive",
            title: "Product Not Found",
            description: `No product found with barcode: ${barcode}`,
        })
      }
      event.currentTarget.value = '';
    }
  };

  const handleCompleteSale = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to complete a sale.",
      });
      return;
    }
    
    if (cart.length === 0) {
       toast({
        variant: "destructive",
        title: "Cart is empty",
        description: "Add products to the cart to complete a sale.",
      });
      return;
    }

    const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    if (paymentMethod === 'Cash' && amountPaid < total) {
      toast({
        variant: "destructive",
        title: "Insufficient Payment",
        description: "The amount paid must be equal to or greater than the total amount.",
      });
      return;
    }
    
    const newSale: Omit<Sale, 'id'> = {
      date: new Date().toISOString(),
      total: total,
      customerName: 'Walk-in Customer',
      userId: user.id,
      items: cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
      })),
      paymentMethod: paymentMethod,
      subtotal: subtotal,
      tax: tax,
      amountPaid: paymentMethod === 'Card' ? total : amountPaid,
      change: paymentMethod === 'Cash' ? Math.max(0, amountPaid - total) : 0,
      salesperson: `${user.firstName} ${user.lastName}` || 'Unknown',
      status: 'Completed',
    }

    try {
      const salesCollection = collection(firestore, `sales`);
      const docRef = await addDocumentNonBlocking(salesCollection, newSale);

      if (!docRef) {
        throw new Error("Failed to get document reference from sale creation.");
      }

      // Update stock levels
      const batch = writeBatch(firestore);
      cart.forEach(item => {
        const productRef = doc(firestore, 'products', item.product.id);
        const newStock = item.product.stock - item.quantity;
        batch.update(productRef, { stock: newStock });
      });
      await batch.commit();
      
      setCompletedSale({ ...newSale, id: docRef.id });

    } catch (error) {
      console.error("Error completing sale:", error);
      toast({
        variant: "destructive",
        title: "Sale Failed",
        description: "Could not complete the transaction. Check security rules or network.",
      });
    }
  }

  const handleCloseReceipt = () => {
    setCompletedSale(null);
    setCart([]);
    setAmountPaid(0);
    setPaymentMethod('Cash');
     toast({
      title: "Sale Completed",
      description: "The transaction has been successfully recorded.",
    });
  }

  const handleRequestAction = (action: 'return' | 'void' | 'withdrawal') => {
    setPendingAction(action);
    setPinAuthOpen(true);
  };

  const handlePinSuccess = (admin: UserProfile) => {
    setAuthorizingAdmin(admin);
    setPinAuthOpen(false);

    switch (pendingAction) {
      case 'return':
        toast({
          title: "Return Mode Activated",
          description: `Authorized by ${admin.firstName} ${admin.lastName}. You can now process returns.`,
        });
        // Navigate to returns page or activate return mode
        break;
      case 'void':
        toast({
          title: "Void Mode Activated",
          description: `Authorized by ${admin.firstName} ${admin.lastName}. You can now void transactions.`,
        });
        // Activate void mode
        break;
      case 'withdrawal':
        toast({
          title: "Withdrawal Mode Activated",
          description: `Authorized by ${admin.firstName} ${admin.lastName}. Process cash withdrawal.`,
        });
        // Activate withdrawal mode
        break;
    }

    setPendingAction(null);
  };

  const isLoading = productsLoading || sessionLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role === 'Sales' && !tillIsOpen) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <Alert className="max-w-md text-center">
          <Landmark className="h-5 w-5" />
          <AlertTitle className="font-bold">Till Closed</AlertTitle>
          <AlertDescription>
            Your till session has not been started for the day. Please contact an administrator to open your till.
          </AlertDescription>
        </Alert>
      </div>
    );
  }


  return (
    <>
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        <PageHeader title="Point of Sale">
          <div className="flex items-center gap-2 w-full">
            <div className="relative flex-1 max-w-sm">
              <Input
                type="text"
                placeholder="Scan or enter barcode..."
                onKeyDown={handleBarcodeScan}
                className="pl-10"
                disabled={productsLoading}
              />
              <span className="absolute inset-y-0 left-0 flex items-center justify-center pl-3">
                <Barcode className="h-5 w-5 text-muted-foreground" />
              </span>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRequestAction('return')}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Returns</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRequestAction('void')}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Voids</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRequestAction('withdrawal')}
                className="gap-2"
              >
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">Withdrawal</span>
              </Button>
            </div>
          </div>
        </PageHeader>
        <div className="flex-grow overflow-hidden">
          <div className="grid md:grid-cols-[2fr_1fr] gap-8 h-full">
            <div className="h-full min-h-0">
              <ScrollArea className="h-full">
                {productsLoading ? (
                  <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pr-4">
                  {products?.map((product) => (
                    <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
                  ))}
                </div>
                )}
              </ScrollArea>
            </div>
            <div className="hidden md:block h-full min-h-0">
              <PosCart 
                items={cart} 
                taxRate={taxRate}
                paymentMethod={paymentMethod}
                amountPaid={amountPaid}
                onUpdateQuantity={handleUpdateQuantity} 
                onRemoveItem={handleRemoveItem}
                onTaxRateChange={handleTaxRateChange}
                onPaymentMethodChange={setPaymentMethod}
                onAmountPaidChange={setAmountPaid}
                onCheckout={handleCompleteSale}
              />
            </div>
          </div>
        </div>
      </div>
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          isOpen={!!completedSale}
          onClose={handleCloseReceipt}
        />
      )}
      <PinAuthDialog
        open={pinAuthOpen}
        onOpenChange={setPinAuthOpen}
        onSuccess={handlePinSuccess}
        title={`${pendingAction?.charAt(0).toUpperCase()}${pendingAction?.slice(1)} - Administrator PIN Required`}
        description={`Enter your 6-digit administrator PIN to proceed with ${pendingAction}.`}
      />
    </>
  );
}
