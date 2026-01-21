'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { CartItem } from '@/lib/types';
import { X, Plus, Minus, CreditCard, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PosCartProps {
  items: CartItem[];
  taxRate: number;
  paymentMethod: 'Card' | 'Cash';
  amountPaid: number;
  isProcessingCard?: boolean;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onTaxRateChange: (rate: number) => void;
  onPaymentMethodChange: (method: 'Card' | 'Cash') => void;
  onAmountPaidChange: (amount: number) => void;
  onCheckout: () => void;
}

export function PosCart({ 
  items, 
  taxRate, 
  paymentMethod,
  amountPaid,
  isProcessingCard = false,
  onUpdateQuantity, 
  onRemoveItem, 
  onTaxRateChange,
  onPaymentMethodChange,
  onAmountPaidChange,
  onCheckout,
}: PosCartProps) {
  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  const change = amountPaid > total ? amountPaid - total : 0;

  const isCheckoutDisabled = items.length === 0 || (paymentMethod === 'Cash' && amountPaid < total);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Cart</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow overflow-hidden p-0">
         <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground border-b pb-2 px-6 shrink-0">
            <div className="col-span-6">Item</div>
            <div className="col-span-3 text-center">Qty</div>
            <div className="col-span-3 text-right">Price</div>
          </div>
        <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-6 pt-2">
            {items.length === 0 ? (
            <div className="flex items-center justify-center h-full pt-10">
                <p className="text-muted-foreground">Your cart is empty</p>
            </div>
            ) : (
                <div className="divide-y">
                {items.map((item) => (
                <div key={item.product.id} className="grid grid-cols-12 gap-4 items-center py-3">
                    <div className="col-span-6 text-sm font-medium truncate">{item.product.name}</div>
                    <div className="col-span-3 flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onUpdateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                    >
                        <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-4 text-center">{item.quantity}</span>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                    </div>
                    <div className="col-span-3 text-sm font-medium text-right flex items-center justify-end gap-2">
                        <span>R{(item.product.price * item.quantity).toFixed(2)}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveItem(item.product.id)}>
                            <X className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                </div>
                ))}
                </div>
            )}
            </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex-col !p-4 border-t space-y-3 shrink-0">
        <div className="w-full space-y-2 text-sm">
            <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span>R{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
                <span>Tax (%)</span>
                <div className="relative w-24">
                    <Input
                        type="number"
                        className="h-8 w-full text-right pr-6"
                        value={taxRate}
                        onChange={(e) => onTaxRateChange(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
            </div>
            <div className="flex justify-between text-muted-foreground">
                <span>Tax Amount</span>
                <span>R{tax.toFixed(2)}</span>
            </div>
        </div>
        
        <RadioGroup value={paymentMethod} onValueChange={onPaymentMethodChange} className="flex justify-between items-center w-full pt-2">
              <Label>Payment</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Cash" id="cash" />
                  <Label htmlFor="cash">Cash</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Card" id="card" />
                  <Label htmlFor="card">Card</Label>
                </div>
              </div>
        </RadioGroup>

        <Separator className="my-2"/>

        <div className="w-full space-y-2">
            <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>R{total.toFixed(2)}</span>
            </div>
            {paymentMethod === 'Cash' && (
                <>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Amount Paid</span>
                        <Input
                            type="number"
                            className="h-8 w-28 text-right"
                            value={amountPaid === 0 ? '' : amountPaid}
                            onChange={(e) => onAmountPaidChange(parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                        />
                    </div>
                    {amountPaid >= total && (
                        <div className="flex justify-between text-muted-foreground">
                        <span>Change</span>
                        <span>R{change.toFixed(2)}</span>
                        </div>
                    )}
                </>
            )}
            {paymentMethod === 'Card' && (
                <div className={`flex justify-between items-center p-3 rounded-md transition-all ${isProcessingCard ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50'}`}>
                    <div className="flex items-center gap-2">
                        <CreditCard className={`h-4 w-4 ${isProcessingCard ? 'text-amber-700' : 'text-blue-700'}`} />
                        <span className={`text-sm font-medium ${isProcessingCard ? 'text-amber-700' : 'text-blue-700'}`}>
                            {isProcessingCard ? 'Processing Card...' : 'Ready for Card Machine'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {isProcessingCard && <Loader2 className="h-4 w-4 animate-spin text-amber-700" />}
                        <span className={`text-sm font-semibold ${isProcessingCard ? 'text-amber-700' : 'text-blue-700'}`}>R{total.toFixed(2)}</span>
                    </div>
                </div>
            )}
        </div>
        <Button className="w-full mt-4" disabled={isCheckoutDisabled || isProcessingCard} onClick={onCheckout}>
          {isProcessingCard ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Card Payment...
            </>
          ) : (
            'Complete Sale'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}