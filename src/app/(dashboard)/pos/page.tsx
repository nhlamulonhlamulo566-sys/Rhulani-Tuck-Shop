
'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import PageHeader from '@/components/page-header';
import { ProductCard } from '@/components/pos/product-card';
import { PosCart } from '@/components/pos/pos-cart';
import type { Product, CartItem, Sale } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Barcode, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Receipt, type ReceiptData } from '@/components/pos/receipt';
import { useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export default function PosPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const productsQuery = useMemoFirebase(
    firestore && user ? collection(firestore, 'products') : null,
    'products',
    [firestore, user]
  );

  const { data: products, isLoading: productsLoading, error: productsError } = useCollection<Product>(productsQuery) as any;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastSale, setLastSale] = useState<ReceiptData | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleAddToCart = (product: Product, quantity = 1) => {
    if (product.stock < quantity) {
        toast({
            variant: "destructive",
            title: "Out of Stock",
            description: `Not enough stock for ${product.name}. Only ${product.stock} available.`,
        });
        return;
    }
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id);
      if (existingItem) {
         if ((existingItem.quantity + quantity) <= product.stock) {
            return prevCart.map((item) =>
              item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
            );
         } else {
            toast({
                variant: "destructive",
                title: "Stock Limit Reached",
                description: `You cannot add more of ${product.name}. Only ${product.stock} total available.`,
            });
            return prevCart;
         }
      }
      return [...prevCart, { product, quantity: quantity }];
    });
  };
  
  const handleUpdateQuantity = (productId: string, quantity: number) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity: quantity } : item
      )
    );
  };
  
  const handleRemoveItem = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };
  
  const handleBarcodeScan = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const barcode = event.currentTarget.value;
      if (!products) return;

      let productFound: Product | undefined;
      let quantityToAdd = 1;

      for (const p of products) {
        if (p.barcodeEach && p.barcodeEach === barcode) {
          productFound = p;
          quantityToAdd = 1;
          break;
        }
        if (p.barcodePack && p.barcodePack === barcode) {
          productFound = p;
          quantityToAdd = p.packSize;
          break;
        }
        if (p.barcodeCase && p.barcodeCase === barcode) {
          productFound = p;
          quantityToAdd = p.caseSize;
          break;
        }
      }

      if (productFound) {
        handleAddToCart(productFound, quantityToAdd);
        toast({
            title: "Product Added",
            description: `${productFound.name} (x${quantityToAdd}) has been added to the cart.`,
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

  const finishCheckout = useCallback(() => {
    setCart([]);
    setLastSale(null);
    toast({
        title: "Checkout Successful",
        description: "The sale has been recorded.",
    });
  }, [toast]);


  const handleCheckout = async (saleDetails: Omit<ReceiptData, 'saleId' | 'date'>) => {
    if (cart.length === 0 || !firestore || !user) return;

    const batch = writeBatch(firestore);

    // Update stock levels
    cart.forEach(cartItem => {
      const productRef = doc(firestore, 'products', cartItem.product.id);
      const newStock = cartItem.product.stock - cartItem.quantity;
      batch.update(productRef, { stock: newStock });
    });

    const saleId = `sale-${Date.now()}`;
    const saleDate = new Date();

    const newSale: Omit<Sale, 'id'> = {
      date: saleDate.toISOString(),
      total: saleDetails.total,
      customerName: 'Walk-in Customer',
      items: cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        imageUrl: item.product.imageUrl,
        imageHint: item.product.imageHint,
      })),
      paymentMethod: saleDetails.paymentMethod,
      status: 'completed',
      salespersonId: user.uid,
      salespersonName: user.displayName || user.email || 'Unknown',
      amountPaid: saleDetails.amountPaid,
      change: saleDetails.change
    };

    const saleRef = doc(collection(firestore, 'sales'));
    batch.set(saleRef, newSale);

    try {
        await batch.commit();
        setLastSale({
          ...saleDetails,
          saleId: saleRef.id,
          date: saleDate,
          salespersonName: newSale.salespersonName,
        });
    } catch(e) {
        console.error("Checkout failed:", e);
        const permissionError = new FirestorePermissionError({
            path: 'batch-write',
            operation: 'create',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: "destructive",
            title: "Checkout Failed",
            description: "There was an error processing the sale. Please check permissions and try again.",
        });
    }
  };

  useEffect(() => {
    if (lastSale) {
        window.print();
        finishCheckout();
    }
  }, [lastSale, finishCheckout]);


  return (
    <>
      <div className="flex flex-col h-[calc(100vh-theme(spacing.24))]">
        <PageHeader title="Point of Sale">
          <div className="relative w-full max-w-sm items-center">
              <Input
                type="text"
                placeholder="Scan or enter barcode..."
                onKeyDown={handleBarcodeScan}
                className="pl-10"
              />
              <span className="absolute inset-y-0 left-0 flex items-center justify-center pl-3">
                <Barcode className="h-5 w-5 text-muted-foreground" />
              </span>
            </div>
        </PageHeader>
        <div className="grid md:grid-cols-[2fr_1fr] gap-8 flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            {productsLoading && (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            )}
            {!productsLoading && products && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} onAddToCart={() => handleAddToCart(product, 1)} />
                ))}
              </div>
            )}
            {!productsLoading && productsError && (
              <div className="p-4 text-center text-red-600">Failed to load products: {productsError.message}</div>
            )}
          </ScrollArea>
          <div className="hidden md:block h-full overflow-y-auto">
            <PosCart 
              items={cart} 
              onUpdateQuantity={handleUpdateQuantity} 
              onRemoveItem={handleRemoveItem} 
              onCheckout={handleCheckout} 
            />
          </div>
        </div>
      </div>
      {lastSale && (
        <div className="hidden print-receipt-container">
          <Receipt ref={receiptRef} receiptData={lastSale} />
        </div>
      )}
    </>
  );
}
