'use client';

import { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/page-header';
import { ProductCard } from '@/components/pos/product-card';
import { PosCart } from '@/components/pos/pos-cart';
import type { Product, CartItem, Sale, UserProfile, TillSession } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Barcode, Landmark, Loader2, Wallet, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ReceiptModal } from '@/components/pos/receipt-modal';
import { useFirestore, useCollection, useUser, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, query, where, limit } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { processCardPayment, isValidCardAmount } from '@/lib/card-payment';

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
  const [completedVoucher, setCompletedVoucher] = useState<Sale | null>(null);
  const [pinAuthOpen, setPinAuthOpen] = useState(false);
  const [authorizingAdmin, setAuthorizingAdmin] = useState<UserProfile | null>(null);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalReason, setWithdrawalReason] = useState('Cash');
  const [withdrawalMode, setWithdrawalMode] = useState<'withdrawal' | 'airtime' | 'electricity' | 'voucher'>('withdrawal');
  const [withdrawalPaymentMethod, setWithdrawalPaymentMethod] = useState<'Cash' | 'Card'>('Cash');
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = useState(false);
  const [airtimeVoucherCode, setAirtimeVoucherCode] = useState('');
  const [airtimeNetwork, setAirtimeNetwork] = useState('Vodacom');
  const [electricityMeter, setElectricityMeter] = useState('');
  const [electricityMunicipality, setElectricityMunicipality] = useState('');

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

    // Validate card payment amount
    if (paymentMethod === 'Card' && !isValidCardAmount(total)) {
      toast({
        variant: "destructive",
        title: "Invalid Card Amount",
        description: `Transaction amount must be between R1 and R100,000.`,
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
      // Process card payment if selected
      if (paymentMethod === 'Card') {
        setIsProcessingCard(true);
        const cardResult = await processCardPayment(total, 'ZAR', `Sale by ${user.firstName} ${user.lastName}`);
        
        if (!cardResult.success) {
          toast({
            variant: "destructive",
            title: "Card Payment Failed",
            description: cardResult.error || "The card machine did not respond. Please try again or use cash.",
          });
          setIsProcessingCard(false);
          return;
        }

        // Add card transaction ID to sale record
        newSale.cardTransactionId = cardResult.transactionId;
        
        toast({
          title: "Card Payment Approved",
          description: `Transaction ID: ${cardResult.transactionId}`,
        });
      }

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
    } finally {
      setIsProcessingCard(false);
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

  const handleRequestAction = () => {
    setWithdrawalMode('withdrawal');
    setWithdrawalReason('Cash');
    setWithdrawalPaymentMethod('Cash');
    setWithdrawalDialogOpen(true);
  };

  const handleBuyAirtime = () => {
    setWithdrawalMode('airtime');
    setWithdrawalReason('airtime');
    setWithdrawalPaymentMethod('Card');
    // Generate random 10-digit voucher code
    const voucherCode = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
    setAirtimeVoucherCode(voucherCode);
    setWithdrawalDialogOpen(true);
  };

  const handleBuyElectricity = () => {
    setWithdrawalMode('electricity');
    setWithdrawalReason('electricity');
    setWithdrawalPaymentMethod('Card');
    setWithdrawalDialogOpen(true);
  };

  const handleProcessWithdrawal = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'User Not Found',
        description: 'You must be logged in to process a withdrawal.',
      });
      return;
    }

    if (!withdrawalAmount || isNaN(parseFloat(withdrawalAmount)) || parseFloat(withdrawalAmount) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Amount',
        description: 'Please enter a valid withdrawal amount.',
      });
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    setIsProcessingWithdrawal(true);

    try {
      const salesCollection = collection(firestore, 'sales');

      // Build transaction object based on mode
      let transaction: Omit<Sale, 'id'>;

      if (withdrawalMode === 'withdrawal') {
        transaction = {
          date: new Date().toISOString(),
          total: -amount,
          customerName: 'Cash Withdrawal',
          userId: user.id,
          salesperson: `${user.firstName} ${user.lastName}` || 'Unknown',
          status: 'Withdrawal',
          transactionType: 'withdrawal',
          withdrawalReason: 'Cash',
          paymentMethod: withdrawalPaymentMethod,
        };
      } else if (withdrawalMode === 'airtime') {
        transaction = {
          date: new Date().toISOString(),
          total: amount,
          customerName: `Airtime - ${airtimeNetwork}`,
          userId: user.id,
          salesperson: `${user.firstName} ${user.lastName}` || 'Unknown',
          status: 'Completed',
          transactionType: 'airtime',
          withdrawalReason: 'airtime',
          paymentMethod: withdrawalPaymentMethod,
        };
        // Attach metadata
        (transaction as any).network = airtimeNetwork;
        (transaction as any).voucherCode = airtimeVoucherCode;
      } else if (withdrawalMode === 'electricity') {
        transaction = {
          date: new Date().toISOString(),
          total: amount,
          customerName: `Electricity - ${electricityMunicipality || 'Unknown'}`,
          userId: user.id,
          salesperson: `${user.firstName} ${user.lastName}` || 'Unknown',
          status: 'Completed',
          transactionType: 'electricity',
          withdrawalReason: 'electricity',
          paymentMethod: withdrawalPaymentMethod,
        };
        if (electricityMeter) (transaction as any).meter = electricityMeter;
        if (electricityMunicipality) (transaction as any).municipality = electricityMunicipality;
      } else {
        // voucher or other
        transaction = {
          date: new Date().toISOString(),
          total: amount,
          customerName: withdrawalReason || 'Voucher Purchase',
          userId: user.id,
          salesperson: `${user.firstName} ${user.lastName}` || 'Unknown',
          status: 'Completed',
          transactionType: 'voucher',
          withdrawalReason: withdrawalReason || 'voucher',
          paymentMethod: withdrawalPaymentMethod,
        };
      }

      // Process card payment if selected
      if (withdrawalPaymentMethod === 'Card') {
        const cardResult = await processCardPayment(amount, 'ZAR', `${transaction.transactionType} by ${user.firstName} ${user.lastName}`);
        if (!cardResult.success) {
          toast({
            variant: "destructive",
            title: "Card Payment Failed",
            description: cardResult.error || "The card machine did not respond. Please try again or use cash.",
          });
          setIsProcessingWithdrawal(false);
          return;
        }
        (transaction as any).cardTransactionId = cardResult.transactionId;
        toast({
          title: "Card Payment Approved",
          description: `Transaction ID: ${cardResult.transactionId}`,
        });
      }

      await addDocumentNonBlocking(salesCollection, transaction);

      // Show receipt/voucher for airtime and electricity
      if (withdrawalMode === 'airtime' || withdrawalMode === 'electricity') {
        setCompletedVoucher({ ...transaction, id: Date.now().toString() });
      }

      toast({
        title: withdrawalMode === 'withdrawal' ? 'Withdrawal Processed' : 'Purchase Recorded',
        description: withdrawalMode === 'withdrawal' ? `R${amount.toFixed(2)} has been withdrawn and recorded.` : `R${amount.toFixed(2)} recorded for ${transaction.transactionType}.`,
      });

      // Reset form
      setWithdrawalAmount('');
      setWithdrawalReason('Cash');
      setWithdrawalPaymentMethod('Cash');
      setAirtimeVoucherCode('');
      setAirtimeNetwork('Vodacom');
      setElectricityMeter('');
      setElectricityMunicipality('');
      setWithdrawalMode('withdrawal');
      setWithdrawalDialogOpen(false);
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast({
        variant: 'destructive',
        title: 'Withdrawal Failed',
        description: 'Could not process withdrawal. Please try again.',
      });
    } finally {
      setIsProcessingWithdrawal(false);
    }
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
                onClick={handleRequestAction}
                className="gap-2"
              >
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">Withdrawal</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBuyAirtime}
                className="gap-2"
              >
                <span className="hidden sm:inline">Buy Airtime</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBuyElectricity}
                className="gap-2"
              >
                <span className="hidden sm:inline">Buy Electricity</span>
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
                isProcessingCard={isProcessingCard}
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
      {completedVoucher && (
        <ReceiptModal
          sale={completedVoucher}
          isOpen={!!completedVoucher}
          onClose={() => {
            setCompletedVoucher(null);
            toast({
              title: `${completedVoucher.transactionType === 'airtime' ? 'Airtime' : 'Electricity'} Voucher Printed`,
              description: 'Transaction recorded in the system.',
            });
          }}
        />
      )}
      <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-amber-600" />
              {withdrawalMode === 'airtime' ? 'Airtime Request' : withdrawalMode === 'electricity' ? 'Electricity Request' : 'Withdrawal Request'}
            </DialogTitle>
            <DialogDescription>
              {withdrawalMode === 'airtime' ? 'Enter airtime amount and recipient details.' : withdrawalMode === 'electricity' ? 'Enter electricity amount and meter details.' : 'Enter the withdrawal amount, payment method, and optional reason.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Withdrawal Amount (R) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                placeholder="0.00"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                min="0"
                step="0.01"
                disabled={isProcessingWithdrawal}
                className="text-lg font-semibold"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">
                Payment Method
              </label>
              <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-md">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="withdrawal_cash"
                    name="withdrawal_method"
                    value="Cash"
                    checked={withdrawalPaymentMethod === 'Cash'}
                    onChange={(e) => setWithdrawalPaymentMethod(e.target.value as 'Cash' | 'Card')}
                    disabled={isProcessingWithdrawal}
                    className="h-4 w-4"
                  />
                  <label htmlFor="withdrawal_cash" className="text-sm font-medium cursor-pointer">
                    Cash
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="withdrawal_card"
                    name="withdrawal_method"
                    value="Card"
                    checked={withdrawalPaymentMethod === 'Card'}
                    onChange={(e) => setWithdrawalPaymentMethod(e.target.value as 'Cash' | 'Card')}
                    disabled={isProcessingWithdrawal}
                    className="h-4 w-4"
                  />
                  <label htmlFor="withdrawal_card" className="text-sm font-medium cursor-pointer flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    Card
                  </label>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Reason / Description
              </label>
              {withdrawalMode === 'withdrawal' ? (
                <Textarea
                  value={withdrawalReason || 'Cash'}
                  readOnly
                  disabled
                  rows={2}
                />
              ) : withdrawalMode === 'airtime' ? (
                <div className="space-y-3 bg-blue-50 p-3 rounded-md border border-blue-200">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Network Provider</label>
                    <select
                      className="w-full rounded-md border px-3 py-2 mt-1"
                      value={airtimeNetwork}
                      onChange={(e) => setAirtimeNetwork(e.target.value)}
                      disabled={isProcessingWithdrawal}
                    >
                      <option>Vodacom</option>
                      <option>MTN</option>
                      <option>Telkom</option>
                      <option>Cell C</option>
                    </select>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-300">
                    <p className="text-xs text-gray-600 mb-1">Your Voucher Code:</p>
                    <p className="text-xl font-bold text-blue-600 text-center">{airtimeVoucherCode}</p>
                  </div>
                </div>
              ) : withdrawalMode === 'electricity' ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Meter number / Card number"
                    value={electricityMeter}
                    onChange={(e) => setElectricityMeter(e.target.value)}
                    disabled={isProcessingWithdrawal}
                  />
                  <select
                    className="w-full rounded-md border px-3 py-2"
                    value={electricityMunicipality}
                    onChange={(e) => setElectricityMunicipality(e.target.value)}
                    disabled={isProcessingWithdrawal}
                  >
                    <option>eThekwini</option>
                    <option>City of Johannesburg</option>
                    <option>City of Tshwane</option>
                    <option>Nelson Mandela Bay</option>
                    <option>Other</option>
                  </select>
                  <Textarea value={"electricity"} readOnly disabled rows={2} />
                </div>
              ) : (
                <Textarea
                  placeholder="e.g., voucher provider or note"
                  value={withdrawalReason}
                  onChange={(e) => setWithdrawalReason(e.target.value)}
                  disabled={isProcessingWithdrawal}
                  rows={3}
                />
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setWithdrawalDialogOpen(false);
                setWithdrawalAmount('');
                setWithdrawalReason('Cash');
                setWithdrawalPaymentMethod('Cash');
                setWithdrawalMode('withdrawal');
                setAirtimeVoucherCode('');
                setAirtimeNetwork('Vodacom');
              }}
              disabled={isProcessingWithdrawal}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcessWithdrawal}
              disabled={
                isProcessingWithdrawal || !withdrawalAmount ||
                (withdrawalMode === 'airtime' && !airtimeVoucherCode) ||
                (withdrawalMode === 'electricity' && !electricityMeter)
              }
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isProcessingWithdrawal ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  {withdrawalMode === 'airtime' ? 'Buy Airtime' : withdrawalMode === 'electricity' ? 'Buy Electricity' : (withdrawalPaymentMethod === 'Card' ? 'Process Card Withdrawal' : 'Withdraw Cash')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
