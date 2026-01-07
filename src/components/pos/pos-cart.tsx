'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { CartItem, Sale } from '@/lib/types';
import { X, Plus, Minus, Percent } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ReceiptData } from './receipt';

interface PosCartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: (saleDetails: Omit<ReceiptData, 'saleId' | 'date'>) => void;
}

export function PosCart({ items, onUpdateQuantity, onRemoveItem, onCheckout }: PosCartProps) {
  const [paymentMethod, setPaymentMethod] = useState<Sale['paymentMethod']>('Cash');
  const [taxPercentage, setTaxPercentage] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const taxAmount = subtotal * (taxPercentage / 100);
  const total = subtotal + taxAmount;
  const change = amountPaid > total ? amountPaid - total : 0;

  const handleCheckout = () => {
    onCheckout({
      items,
      subtotal,
      taxAmount,
      total,
      amountPaid,
      change,
      paymentMethod,
    });
    setAmountPaid(0);
  }

  const handleAmountPaidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setAmountPaid(isNaN(value) ? 0 : value);
  };
  
  const handleTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setTaxPercentage(isNaN(value) ? 0 : value);
  };
  
  const isCheckoutDisabled = () => {
    if (items.length === 0) return true;
    if (paymentMethod === 'Cash') {
      return amountPaid < total;
    }
    return false;
  };
  
  // After checkout, items will be empty, resetting the view
  useEffect(() => {
    if (items.length === 0) {
      setAmountPaid(0);
      // Tax percentage persists
    }
  }, [items]);

  if (!isClient) {
    return null; // or a loading skeleton
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Cart</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        <ScrollArea className="h-full">
            {items.length === 0 ? (
              <div className="flex items-center justify-center h-full px-6">
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-4 px-6">
                <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 pb-2 border-b">
                    <p className="text-sm font-medium text-muted-foreground">Product</p>
                    <p className="text-sm font-medium text-muted-foreground text-center">Qty</p>
                    <p className="text-sm font-medium text-muted-foreground text-right">Price</p>
                    <div className="w-8"></div>
                  </div>
                {items.map((item) => (
                  <div key={item.product.id} className="grid grid-cols-[2fr_1fr_1fr_auto] items-center gap-4">
                    <div className="pr-2">
                        <p className="font-medium text-sm truncate">{item.product.name}</p>
                    </div>

                    <div className="flex items-center gap-1 justify-center">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => onUpdateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                        >
                            <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-5 text-center text-sm">{item.quantity}</span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                    </div>
                    <p className="text-sm font-medium text-right">
                        R{(item.product.price * item.quantity).toFixed(2)}
                    </p>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemoveItem(item.product.id)}>
                        <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex-col !p-6 border-t">
        <div className="w-full space-y-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>R{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <Label htmlFor="tax-percentage">Tax (%)</Label>
            <div className="relative">
              <Input 
                id="tax-percentage"
                type="number"
                value={taxPercentage === 0 ? '' : taxPercentage}
                onChange={handleTaxChange}
                className="w-24 h-8 pl-3 pr-6 text-right"
                placeholder="0"
              />
              <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Tax Amount</span>
            <span>R{taxAmount.toFixed(2)}</span>
          </div>
          <Separator className="my-2"/>
          <RadioGroup defaultValue="Cash" value={paymentMethod} onValueChange={(value: Sale['paymentMethod']) => setPaymentMethod(value)} className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Cash" id="cash" />
              <Label htmlFor="cash">Cash</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Card" id="card" />
              <Label htmlFor="card">Card</Label>
            </div>
          </RadioGroup>
          <Separator className="my-2"/>
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>R{total.toFixed(2)}</span>
          </div>
           {paymentMethod === 'Cash' && (
            <>
              <div className="flex justify-between items-center">
                <Label htmlFor="amount-paid">Amount Paid</Label>
                <Input
                  id="amount-paid"
                  type="number"
                  value={amountPaid === 0 ? '' : amountPaid}
                  onChange={handleAmountPaidChange}
                  className="w-24 h-8 text-right"
                  placeholder="0.00"
                />
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Change</span>
                <span>R{change.toFixed(2)}</span>
              </div>
            </>
           )}
        </div>
        <Button className="w-full mt-4" disabled={isCheckoutDisabled()} onClick={handleCheckout}>
          Checkout
        </Button>
      </CardFooter>
    </Card>
  );
}
