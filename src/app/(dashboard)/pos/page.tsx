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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Barcode, Landmark, Loader2, Trash2, RotateCcw, AlertTriangle, Gift, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ReceiptModal } from '@/components/pos/receipt-modal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PinAuthDialog } from '@/components/auth/pin-auth-dialog';
import { processCardPayment, isValidCardAmount, checkCardMachineStatus, type CardMachineStatus } from '@/lib/card-payment';
import { useCollection } from '@/hooks/use-db-collection';

export default function PosPage() {
  const { data: products, isLoading: productsLoading, refetch: refetchProducts } = useCollection<Product>('products');
  const { data: sessions, isLoading: sessionLoading, refetch: refetchSessions } = useCollection<TillSession>('till-management');
  const { data: sales, refetch: refetchSales } = useCollection<Sale>('sales');
  
  const activeSessions = sessions?.filter(session => session.status === 'Active') || [];
  const userSessions = activeSessions.filter(s => s.userId === sessionStorage.getItem('currentUser')?.split('"id":"')[1]?.split('"')[0]);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentSession, setCurrentSession] = useState<TillSession | null>(null);
  const [openingBalanceDialog, setOpeningBalanceDialog] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [closingBalanceDialog, setClosingBalanceDialog] = useState(false);
  const [closingBalance, setClosingBalance] = useState(0);
  
  const tillIsOpen = useMemo(() => !!currentSession, [currentSession]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const { toast } = useToast();
  const [taxRate, setTaxRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card'>('Cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  
  // PIN Authorization states
  const [pinAuthOpen, setPinAuthOpen] = useState(false);
  const [authorizingAdmin, setAuthorizingAdmin] = useState<UserProfile | null>(null);
  const [pinAuthAction, setPinAuthAction] = useState<'open' | 'close' | 'withdrawal' | 'voucher' | 'void' | 'return'>('open');
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  
  // Card machine status
  const [cardMachineStatus, setCardMachineStatus] = useState<CardMachineStatus | null>(null);
  
  // Withdrawal/Void/Return states
  const [withdrawalAmount, setWithdrawalAmount] = useState(0);
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [saleToVoid, setSaleToVoid] = useState<Sale | null>(null);
  const [saleToReturn, setSaleToReturn] = useState<Sale | null>(null);
  
  // Voucher states
  const [showVoucherDialog, setShowVoucherDialog] = useState(false);
  const [selectedVoucherProvider, setSelectedVoucherProvider] = useState<'mtn' | 'vodacom' | 'cellc' | 'telkom' | 'one-voucher' | 'ott-voucher' | null>(null);
  const [voucherAmount, setVoucherAmount] = useState(0);
  const [voucherPhone, setVoucherPhone] = useState('');
  const [voucherPaymentMethod, setVoucherPaymentMethod] = useState<'Cash' | 'Card'>('Cash');
  const [withdrawalPaymentMethod, setWithdrawalPaymentMethod] = useState<'Cash' | 'Card'>('Cash');
  const [generatedVoucherNumber, setGeneratedVoucherNumber] = useState<string | null>(null);
  
  // Generate unique voucher number
  const generateVoucherNumber = (): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `VC-${timestamp}-${random}`;
  };
  
  const voucherProviders = [
    { id: 'one-voucher', name: '1Voucher', icon: '🎟️', color: 'bg-slate-700', requiresPhone: false },
    { id: 'ott-voucher', name: 'OTT Voucher', icon: '📺', color: 'bg-fuchsia-500', requiresPhone: false },
    { id: 'mtn', name: 'MTN', icon: '📱', color: 'bg-yellow-500', requiresPhone: false },
    { id: 'vodacom', name: 'Vodacom', icon: '📱', color: 'bg-red-500', requiresPhone: false },
    { id: 'cellc', name: 'Cell C', icon: '📱', color: 'bg-orange-500', requiresPhone: false },
    { id: 'telkom', name: 'Telkom', icon: '📱', color: 'bg-blue-600', requiresPhone: false },
  ] as const;

  useEffect(() => {
    const checkCardMachine = async () => {
      try {
        const status = await checkCardMachineStatus();
        setCardMachineStatus(status);
      } catch (error) {
        console.error('Failed to check card machine status:', error);
        setCardMachineStatus({ isConnected: false, provider: 'local', lastCheckTime: new Date().toISOString() });
      }
    };

    // Check immediately
    checkCardMachine();

    // Check every 30 seconds
    const interval = setInterval(checkCardMachine, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Get user from sessionStorage
    const userData = sessionStorage.getItem('currentUser');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    console.log('PIN auth state changed:', { pinAuthOpen, pinAuthAction, saleToVoid: saleToVoid?.id, saleToReturn: saleToReturn?.id, closingBalanceDialog });
  }, [pinAuthOpen, pinAuthAction, saleToVoid, saleToReturn, closingBalanceDialog]);

  // Check for existing active session for this user
  useEffect(() => {
    if (user && userSessions.length > 0) {
      setCurrentSession(userSessions[0]);
      setSessionStarted(true);
      setOpeningBalanceDialog(false);
      // Only reset PIN auth if we're not in the middle of an action
      if (pinAuthAction === 'open') {
        setPinAuthOpen(false);
      }
    } else if (user && userSessions.length === 0 && !sessionStarted && !currentSession && !openingBalanceDialog) {
      // Require PIN auth first before opening balance dialog
      setPinAuthOpen(true);
      setPinAuthAction('open');
    }
  }, [user, userSessions, sessionStarted, pinAuthAction, currentSession, openingBalanceDialog]);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !authorizingAdmin || openingBalance < 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Opening Balance',
        description: 'Please enter a valid opening balance and administrator authorization.',
      });
      return;
    }

    try {
      const newSession: Omit<TillSession, 'id'> = {
        startDate: new Date().toISOString(),
        openingBalance: openingBalance,
        status: 'Active',
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        startedBy: `${authorizingAdmin.firstName} ${authorizingAdmin.lastName}`,
      };

      const response = await fetch('/api/till-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSession),
      });

      if (!response.ok) throw new Error('Failed to start session');
      
      const session = await response.json();
      setCurrentSession(session);
      setSessionStarted(true);
      setOpeningBalanceDialog(false);
      setAuthorizingAdmin(null);
      
      toast({
        title: 'Till Session Started',
        description: `Opening balance: R${openingBalance.toFixed(2)} - Authorized by ${authorizingAdmin.firstName} ${authorizingAdmin.lastName}`,
      });

      refetchSessions();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error Starting Session',
        description: 'Could not start your till session.',
      });
    }
  };

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

    // Check card machine connection for card payments
    if (paymentMethod === 'Card') {
      if (!cardMachineStatus?.isConnected) {
        toast({
          variant: "destructive",
          title: "Card Machine Not Connected",
          description: "Please connect the card machine to process card payments.",
        });
        return;
      }
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
        const cardResult = await processCardPayment(total, 'ZAR', `Sale by ${user?.firstName} ${user?.lastName}`);

        if (!cardResult.success) {
          toast({
            variant: "destructive",
            title: "Card Payment Failed",
            description: cardResult.error || "Card payment could not be processed.",
          });
          setIsProcessingCard(false);
          return;
        }

        // Add card transaction ID to sale record (saved locally)
        newSale.cardTransactionId = cardResult.transactionId;

        toast({
          title: "Card Payment Processed",
          description: `Transaction ID: ${cardResult.transactionId} - Saved locally`,
        });
      }

      // Create sale via API
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSale),
      });

      if (!response.ok) {
        throw new Error('Failed to create sale');
      }

      const createdSale = await response.json();
      setCompletedSale(createdSale);

      // Refresh products to update stock levels
      refetchProducts();

    } catch (error) {
      console.error("Error completing sale:", error);
      toast({
        variant: "destructive",
        title: "Sale Failed",
        description: "Could not complete the transaction. Please try again.",
      });
    } finally {
      setIsProcessingCard(false);
    }
  }

  const handleCloseReceipt = () => {
    setCompletedSale(null);
    setGeneratedVoucherNumber(null);
    setCart([]);
    setAmountPaid(0);
    setPaymentMethod('Cash');
     toast({
      title: "Transaction Completed",
      description: "The transaction has been successfully recorded.",
    });
  }

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || withdrawalAmount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Withdrawal',
        description: 'Please enter a valid amount.',
      });
      return;
    }

    try {
      const withdrawalRecord: Omit<Sale, 'id'> = {
        date: new Date().toISOString(),
        total: withdrawalAmount,
        customerName: 'Cash Withdrawal',
        userId: user.id,
        paymentMethod: withdrawalPaymentMethod,
        amountPaid: withdrawalAmount,
        change: 0,
        salesperson: `${user.firstName} ${user.lastName}`,
        status: 'Completed',
        withdrawalReason: withdrawalReason,
        transactionType: 'withdrawal',
      };

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withdrawalRecord),
      });

      if (!response.ok) throw new Error('Failed to record withdrawal');

      toast({
        title: 'Withdrawal Processed',
        description: `R${withdrawalAmount.toFixed(2)} withdrawn successfully`,
      });

      setWithdrawalAmount(0);
      setWithdrawalReason('');
      setShowWithdrawalDialog(false);
      setWithdrawalPaymentMethod('Cash');
      refetchSales();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error Recording Withdrawal',
        description: 'Could not record the withdrawal.',
      });
    }
  };

  const handleVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || voucherAmount <= 0 || !selectedVoucherProvider) {
      toast({
        variant: 'destructive',
        title: 'Invalid Voucher',
        description: 'Please enter a valid amount.',
      });
      return;
    }

    const provider = voucherProviders.find(p => p.id === selectedVoucherProvider);
    if (!provider) {
      toast({
        variant: 'destructive',
        title: 'Invalid Provider',
        description: 'Please select a valid voucher provider.',
      });
      return;
    }

    try {
      const voucherNumber = generateVoucherNumber();
      const providerName = provider?.name || 'Unknown';
      const voucherDescription = provider.name;

      const voucherRecord: Omit<Sale, 'id'> = {
        date: new Date().toISOString(),
        total: voucherAmount,
        customerName: providerName,
        userId: user.id,
        paymentMethod: voucherPaymentMethod,
        amountPaid: voucherAmount,
        change: 0,
        salesperson: `${user.firstName} ${user.lastName}`,
        status: 'Completed',
        withdrawalReason: voucherDescription,
        transactionType: 'voucher',
        voucherNumber: voucherNumber,
      };

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voucherRecord),
      });

      if (!response.ok) throw new Error('Failed to record voucher');

      // Store voucher info for receipt printing
      setGeneratedVoucherNumber(voucherNumber);
      setCompletedSale({
        id: Date.now().toString(),
        date: new Date().toISOString(),
        total: voucherAmount,
        customerName: providerName,
        userId: user.id,
        paymentMethod: voucherPaymentMethod,
        amountPaid: voucherAmount,
        change: 0,
        salesperson: `${user.firstName} ${user.lastName}`,
        status: 'Completed',
        withdrawalReason: voucherDescription,
        transactionType: 'voucher',
        voucherNumber: voucherNumber,
        items: [],
      });

      toast({
        title: 'Voucher Sold Successfully',
        description: `${providerName} voucher - R${voucherAmount.toFixed(2)} | Voucher #: ${voucherNumber}`,
      });

      setVoucherAmount(0);
      setVoucherPhone('');
      setSelectedVoucherProvider(null);
      setShowVoucherDialog(false);
      setVoucherPaymentMethod('Cash');
      refetchSales();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error Recording Voucher',
        description: 'Could not record the voucher sale.',
      });
    }
  };

  const handleVoidSale = async (saleId: string, admin?: UserProfile) => {
    const authorizer = admin || authorizingAdmin;

    if (!authorizer) {
      setPinAuthOpen(true);
      setPinAuthAction('void');
      setSaleToVoid(sales?.find(s => s.id === saleId) || null);
      return;
    }

    try {
      const response = await fetch(`/api/sales/${saleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Voided',
          authorizations: [{
            userId: authorizer.id,
            userName: `${authorizer.firstName} ${authorizer.lastName}`,
            timestamp: new Date().toISOString(),
            action: 'void',
            details: 'Sale voided by administrator',
          }],
        }),
      });

      if (!response.ok) throw new Error('Failed to void sale');

      // Restock items if transaction contains items
      const saleToProcess = sales?.find(s => s.id === saleId);
      if (saleToProcess?.items) {
        for (const item of saleToProcess.items) {
          const restockQty = item.quantity - (item.returnedQuantity || 0);
          if (restockQty > 0) {
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
        description: 'The sale has been successfully voided and inventory restored.',
      });

      setAuthorizingAdmin(null);
      setSaleToVoid(null);
      refetchSales();
      refetchProducts();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error Voiding Sale',
        description: 'Could not void the sale.',
      });
    }
  };

  const handleReturnSale = async (saleId: string, admin?: UserProfile) => {
    const authorizer = admin || authorizingAdmin;

    if (!authorizer) {
      setPinAuthOpen(true);
      setPinAuthAction('return');
      setSaleToReturn(sales?.find(s => s.id === saleId) || null);
      return;
    }

    try {
      const saleToProcess = sales?.find(s => s.id === saleId);
      if (!saleToProcess) throw new Error('Sale not found');

      // Create a full return (reverse entire transaction)
      const response = await fetch(`/api/sales/${saleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Returned',
          authorizations: [{
            userId: authorizer.id,
            userName: `${authorizer.firstName} ${authorizer.lastName}`,
            timestamp: new Date().toISOString(),
            action: 'return',
            details: 'Full sale returned by administrator',
          }],
        }),
      });

      if (!response.ok) throw new Error('Failed to return sale');

      // Restock all items
      if (saleToProcess.items) {
        for (const item of saleToProcess.items) {
          const restockQty = item.quantity - (item.returnedQuantity || 0);
          if (restockQty > 0) {
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
        title: 'Sale Returned',
        description: 'The sale has been successfully returned and inventory restored.',
      });

      setAuthorizingAdmin(null);
      setSaleToReturn(null);
      refetchSales();
      refetchProducts();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error Returning Sale',
        description: 'Could not return the sale.',
      });
    }
  };

  const handleCloseSession = async () => {
    console.log('Close till button clicked');
    if (!user || !currentSession) {
      console.log('No user or session:', { user, currentSession });
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No active session to close.',
      });
      return;
    }

    console.log('Setting PIN auth for close');
    // First require PIN auth
    setPinAuthOpen(true);
    setPinAuthAction('close');
  };

  const handleCloseTillWithAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Closing till with auth:', { user, currentSession, authorizingAdmin, closingBalance });
    if (!user || !currentSession || !authorizingAdmin || closingBalance < 0) {
      console.log('Validation failed');
      toast({
        variant: 'destructive',
        title: 'Invalid Closing Balance',
        description: 'Please enter a valid closing balance.',
      });
      return;
    }

    try {
      console.log('Making API call to close session');
      const response = await fetch(`/api/till-management/${currentSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closingBalance: closingBalance,
          endDate: new Date().toISOString(),
          status: 'Closed',
          closedBy: `${authorizingAdmin.firstName} ${authorizingAdmin.lastName}`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('API call failed:', response.status, errorText);
        throw new Error('Failed to close session');
      }

      const closedSession = await response.json();
      console.log('Session closed successfully:', closedSession);
      setCurrentSession(null);
      setSessionStarted(false);
      setClosingBalanceDialog(false);
      setAuthorizingAdmin(null);
      setClosingBalance(0);

      toast({
        title: 'Till Session Closed',
        description: `Closing balance: R${closingBalance.toFixed(2)} - Closed by ${authorizingAdmin.firstName} ${authorizingAdmin.lastName}`,
      });

      refetchSessions();
    } catch (error) {
      console.error('Error closing session:', error);
      toast({
        variant: 'destructive',
        title: 'Error Closing Session',
        description: 'Could not close your till session.',
      });
    }
  };

  const handlePinAuthSuccess = async (admin: UserProfile) => {
    console.log('PIN auth success:', admin, 'action:', pinAuthAction);
    setAuthorizingAdmin(admin);
    setPinAuthOpen(false);

    if (pinAuthAction === 'open') {
      // Show opening balance dialog after PIN auth
      setOpeningBalanceDialog(true);
    } else if (pinAuthAction === 'close') {
      console.log('Showing closing balance dialog');
      // Show closing balance dialog after PIN auth
      setClosingBalanceDialog(true);
    } else if (pinAuthAction === 'void') {
      // Void the sale with the authenticated admin directly
      if (saleToVoid) {
        await handleVoidSale(saleToVoid.id, admin);
        setSaleToVoid(null);
      }
    } else if (pinAuthAction === 'return') {
      // Return the sale with the authenticated admin directly
      if (saleToReturn) {
        await handleReturnSale(saleToReturn.id, admin);
        setSaleToReturn(null);
      }
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

  // Sales, Administration, and Super Administration can access POS
  if (user?.role !== 'Sales' && user?.role !== 'Administration' && user?.role !== 'Super Administration') {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <Alert className="max-w-md text-center">
          <Landmark className="h-5 w-5" />
          <AlertTitle className="font-bold">Access Denied</AlertTitle>
          <AlertDescription>
            Only sales personnel and administrators can access the Point of Sale. Please contact an administrator if you need assistance.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!sessionStarted || !currentSession) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        {/* PIN Auth Dialog for Opening Till */}
        <PinAuthDialog
          open={pinAuthOpen && pinAuthAction === 'open'}
          onOpenChange={(open) => {
            setPinAuthOpen(open);
            if (!open) {
              setPinAuthAction('open');
            }
          }}
          onSuccess={handlePinAuthSuccess}
          title="Administrator Authorization Required"
          description="Enter administrator PIN to authorize opening the till and starting sales."
        />

        {/* Opening Balance Dialog */}
        <Dialog open={openingBalanceDialog} onOpenChange={setOpeningBalanceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Till Session</DialogTitle>
              <DialogDescription>
                {authorizingAdmin 
                  ? `Authorized by: ${authorizingAdmin.firstName} ${authorizingAdmin.lastName}`
                  : 'Enter your opening balance to begin selling.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleStartSession} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="opening-balance">Opening Balance (R)</Label>
                <Input
                  id="opening-balance"
                  type="number"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  required
                  disabled={!authorizingAdmin}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={!authorizingAdmin}>
                  Start Session
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Get today's sales
  const todaysSales = sales?.filter(sale => {
    const saleDate = new Date(sale.date);
    const today = new Date();
    return saleDate.toDateString() === today.toDateString() && 
           (sale.status === 'Completed' || sale.status === 'Voided' || sale.status === 'Returned' || sale.status === 'Partially Returned');
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10) || [];

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
                onClick={() => setShowWithdrawalDialog(true)}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                Withdrawal
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVoucherDialog(true)}
                className="gap-2"
              >
                <Gift className="h-4 w-4" />
                Vouchers
              </Button>
              {currentSession && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCloseSession}
                  className="gap-2"
                >
                  Close Till
                </Button>
              )}
            </div>
          </div>
        </PageHeader>
        <div className="flex-grow overflow-hidden">
          <div className="grid md:grid-cols-[2fr_1fr_auto] gap-8 h-full">
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
            <div className="hidden lg:block h-full min-h-0 w-80">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Transactions Today</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-0 px-3">
                  {todaysSales.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-8">
                      No transactions yet
                    </div>
                  ) : (
                    <div className="space-y-2 pb-3">
                      {todaysSales.map((sale) => (
                        <div key={sale.id} className="border rounded-lg p-3 text-xs space-y-2 hover:bg-slate-50">
                          <div className="flex justify-between items-start">
                            <span className="font-medium truncate flex-1">{sale.customerName}</span>
                            <Badge 
                              variant={
                                sale.status === 'Completed' ? 'default' :
                                sale.status === 'Voided' ? 'destructive' :
                                sale.status === 'Returned' ? 'destructive' :
                                'secondary'
                              }
                              className="ml-2 flex-shrink-0"
                            >
                              {sale.status === 'Partially Returned' ? 'Partial Return' : sale.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">R{typeof sale.total === 'string' ? parseFloat(sale.total).toFixed(2) : (sale.total as number).toFixed(2)}</span>
                            <span className="text-muted-foreground">{new Date(sale.date).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          {sale.status === 'Completed' && (
                            <div className="flex gap-1 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-6 text-xs"
                                onClick={() => handleVoidSale(sale.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Void
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-6 text-xs"
                                onClick={() => handleReturnSale(sale.id)}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Return
                              </Button>
                            </div>
                          )}
                          {sale.status !== 'Completed' && (
                            <div className="text-xs text-muted-foreground pt-1">
                              By: {sale.salesperson}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
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

      {/* Withdrawal Dialog */}
      <Dialog 
        open={showWithdrawalDialog} 
        onOpenChange={(open) => {
          setShowWithdrawalDialog(open);
          if (!open) {
            setWithdrawalAmount(0);
            setWithdrawalReason('');
            setWithdrawalPaymentMethod('Cash');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cash Withdrawal</DialogTitle>
            <DialogDescription>
              Record cash withdrawal from till
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleWithdrawal} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (R)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for withdrawal..."
                value={withdrawalReason}
                onChange={(e) => setWithdrawalReason(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={withdrawalPaymentMethod === 'Cash' ? 'default' : 'outline'}
                  onClick={() => setWithdrawalPaymentMethod('Cash')}
                  className="flex-1"
                >
                  Cash
                </Button>
                <Button
                  type="button"
                  variant={withdrawalPaymentMethod === 'Card' ? 'default' : 'outline'}
                  onClick={() => setWithdrawalPaymentMethod('Card')}
                  className="flex-1"
                >
                  Card
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowWithdrawalDialog(false);
              }}>
                Cancel
              </Button>
              <Button type="submit">Confirm Withdrawal</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Voucher Selection Dialog */}
      <Dialog open={showVoucherDialog && !selectedVoucherProvider} onOpenChange={(open) => {
        setShowVoucherDialog(open);
        if (!open) {
          setSelectedVoucherProvider(null);
          setVoucherAmount(0);
          setVoucherPhone('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Voucher Provider</DialogTitle>
            <DialogDescription>Choose a voucher provider to sell</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            {voucherProviders.map((provider) => (
              <button
                key={provider.id}
                onClick={() => setSelectedVoucherProvider(provider.id as 'mtn' | 'vodacom' | 'cellc' | 'telkom' | 'one-voucher' | 'ott-voucher')}
                className={`p-4 rounded-lg border-2 border-transparent transition-all hover:border-primary ${provider.color} text-white font-semibold flex items-center gap-3`}
              >
                <span className="text-2xl">{provider.icon}</span>
                <span>{provider.name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Voucher Details Dialog */}
      <Dialog open={showVoucherDialog && selectedVoucherProvider !== null} onOpenChange={(open) => {
        if (!open) {
          setSelectedVoucherProvider(null);
          setVoucherAmount(0);
          setVoucherPhone('');
          setShowVoucherDialog(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {voucherProviders.find(p => p.id === selectedVoucherProvider)?.name} {voucherProviders.find(p => p.id === selectedVoucherProvider)?.requiresPhone ? 'Airtime' : 'Voucher'}
            </DialogTitle>
            <DialogDescription>
              Complete your purchase to generate voucher
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVoucher} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voucher-amount">Amount (R)</Label>
              <Input
                id="voucher-amount"
                type="number"
                placeholder="0.00"
                value={voucherAmount}
                onChange={(e) => setVoucherAmount(parseFloat(e.target.value) || 0)}
                min="10"
                step="10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={voucherPaymentMethod === 'Cash' ? 'default' : 'outline'}
                  onClick={() => setVoucherPaymentMethod('Cash')}
                  className="flex-1"
                >
                  Cash
                </Button>
                <Button
                  type="button"
                  variant={voucherPaymentMethod === 'Card' ? 'default' : 'outline'}
                  onClick={() => setVoucherPaymentMethod('Card')}
                  className="flex-1"
                >
                  Card
                </Button>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                <strong>✓ Ready to Process</strong> - Voucher number will be generated upon completion
              </p>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setSelectedVoucherProvider(null);
                  setVoucherAmount(0);
                  setVoucherPhone('');
                  setShowVoucherDialog(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Complete Voucher Sale</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Closing Balance Dialog */}
      <Dialog open={closingBalanceDialog} onOpenChange={setClosingBalanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Till Session</DialogTitle>
            <DialogDescription>
              {authorizingAdmin 
                ? `Authorized by: ${authorizingAdmin.firstName} ${authorizingAdmin.lastName}`
                : 'Enter your closing balance to end the shift.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCloseTillWithAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="closing-balance">Closing Balance (R)</Label>
              <Input
                id="closing-balance"
                type="number"
                placeholder="0.00"
                value={closingBalance}
                onChange={(e) => setClosingBalance(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                required
                disabled={!authorizingAdmin}
              />
              <p className="text-xs text-muted-foreground">
                Opening Balance: R{currentSession?.openingBalance ? (currentSession.openingBalance as number).toFixed(2) : '0.00'}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setClosingBalanceDialog(false);
                setAuthorizingAdmin(null);
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={!authorizingAdmin}>
                Close Session
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PIN Authentication Dialog */}
      <PinAuthDialog
        open={pinAuthOpen}
        onOpenChange={(open) => {
          console.log('PIN auth dialog open change:', open);
          setPinAuthOpen(open);
        }}
        onSuccess={handlePinAuthSuccess}
        title={
          pinAuthAction === 'open' 
            ? "Administrator Authorization Required"
            : pinAuthAction === 'close'
            ? "Administrator Authorization Required to Close Till"
            : "Administrator PIN Required"
        }
        description={
          pinAuthAction === 'open' 
            ? "Enter administrator PIN to authorize opening the till and starting sales."
            : pinAuthAction === 'close'
            ? "Enter administrator PIN to authorize closing the till."
            : "Enter administrator PIN to continue."
        }
      />
    </>
  );
}
