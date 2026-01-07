'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Minus, Plus } from 'lucide-react';
import { returnItemsAction } from '@/app/(dashboard)/returns/actions';
import type { Sale, SaleItem } from '@/lib/types';

interface ReturnItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale;
  onReturnSuccess: () => void;
}

interface ReturnItem extends SaleItem {
  returnQuantity: number;
}

export function ReturnItemsDialog({ open, onOpenChange, sale, onReturnSuccess }: ReturnItemsDialogProps) {
  const { toast } = useToast();
  const [isProcessing, startTransition] = useTransition();

  const initialItems: ReturnItem[] = sale.items.map(item => ({
    ...item,
    returnQuantity: 0,
  }));

  const [itemsToReturn, setItemsToReturn] = useState<ReturnItem[]>(initialItems);

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    setItemsToReturn(currentItems =>
      currentItems.map(item => {
        if (item.productId === productId) {
          const maxReturnable = item.quantity - (item.returnedQuantity || 0);
          const validatedQuantity = Math.max(0, Math.min(newQuantity, maxReturnable));
          return { ...item, returnQuantity: validatedQuantity };
        }
        return item;
      })
    );
  };

  const handleProcessReturn = () => {
    const itemsForAction = itemsToReturn
      .filter(item => item.returnQuantity > 0)
      .map(item => ({
        productId: item.productId,
        quantity: item.returnQuantity,
      }));

    if (itemsForAction.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No items selected',
        description: 'Please select a quantity to return for at least one item.',
      });
      return;
    }

    startTransition(async () => {
      const result = await returnItemsAction(sale.id, itemsForAction);
      if (result.success) {
        toast({
          title: 'Return Successful',
          description: 'Stock levels have been updated.',
        });
        onReturnSuccess();
        onOpenChange(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Return Failed',
          description: result.error || 'An unexpected error occurred.',
        });
      }
    });
  };
  
  const totalReturnAmount = itemsToReturn.reduce((total, item) => {
    return total + item.price * item.returnQuantity;
  }, 0);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Process Return</DialogTitle>
          <DialogDescription>
            Select the quantity of items to return for sale {sale.id}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-80 pr-6">
            <div className="grid gap-4 py-4">
            {itemsToReturn.map(item => {
                const maxReturnable = item.quantity - (item.returnedQuantity || 0);
                if (maxReturnable <= 0) return null;

                return (
                    <div key={item.productId} className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor={`return-${item.productId}`} className="col-span-3 text-sm font-medium">
                           {item.productName}
                           <span className="text-xs text-muted-foreground ml-2">(Max: {maxReturnable})</span>
                        </Label>
                        <div className="col-span-3 flex items-center gap-2">
                             <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleQuantityChange(item.productId, item.returnQuantity - 1)}
                                disabled={isProcessing}
                            >
                                <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                                id={`return-${item.productId}`}
                                type="number"
                                value={item.returnQuantity}
                                onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value, 10) || 0)}
                                className="w-16 text-center"
                                disabled={isProcessing}
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleQuantityChange(item.productId, item.returnQuantity + 1)}
                                disabled={isProcessing}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                );
            })}
            </div>
        </ScrollArea>
         <Separator />
        <div className="flex justify-between items-center font-semibold text-lg">
            <span>Total Refund</span>
            <span>R{totalReturnAmount.toFixed(2)}</span>
        </div>
        <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isProcessing}>
                    Cancel
                </Button>
            </DialogClose>
          <Button onClick={handleProcessReturn} disabled={isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
