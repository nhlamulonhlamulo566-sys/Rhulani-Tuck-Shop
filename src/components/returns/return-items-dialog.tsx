'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { Sale } from '@/lib/types';
import { Label } from '../ui/label';

interface ReturnItemsDialogProps {
  sale: Sale;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (returnedItems: { productId: string; quantity: number }[]) => void;
}

export function ReturnItemsDialog({ sale, isOpen, onClose, onConfirm }: ReturnItemsDialogProps) {
  const [selectedItems, setSelectedItems] = useState<{ [productId: string]: number }>({});
  
  useEffect(() => {
    // Reset state when the dialog is opened or the sale changes
    if (isOpen) {
      setSelectedItems({});
    }
  }, [isOpen, sale]);

  const handleQuantityChange = (productId: string, quantity: number) => {
    const originalItem = (sale.items || []).find(item => item.productId === productId);
    if (!originalItem) return;

    const previouslyReturned = originalItem.returnedQuantity || 0;
    const maxReturnable = originalItem.quantity - previouslyReturned;
    
    // Ensure quantity is not negative and not more than what's available to be returned
    const newQuantity = Math.max(0, Math.min(quantity, maxReturnable));

    setSelectedItems(prev => ({
      ...prev,
      [productId]: newQuantity,
    }));
  };
  
  const handleCheckedChange = (checked: boolean, productId: string) => {
    const originalItem = (sale.items || []).find(item => item.productId === productId);
    if (!originalItem) return;

    const previouslyReturned = originalItem.returnedQuantity || 0;
    const maxReturnable = originalItem.quantity - previouslyReturned;

    if (checked && maxReturnable > 0) {
       // Default to returning all remaining items when checked
       setSelectedItems(prev => ({ ...prev, [productId]: maxReturnable }));
    } else {
      setSelectedItems(prev => {
        const newState = { ...prev };
        delete newState[productId];
        return newState;
      });
    }
  }

  const handleConfirm = () => {
    const returnedItems = Object.entries(selectedItems)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));
      
    onConfirm(returnedItems);
  };

  const handleDialogClose = () => {
    onClose();
  }
  
  const isConfirmDisabled = Object.values(selectedItems).every(qty => qty === 0 || isNaN(qty));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { handleDialogClose() }}}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Process Return</DialogTitle>
          <DialogDescription>
            Select the items and quantities to return for sale ID: {sale.id}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            {(sale.items || []).map(item => {
              const previouslyReturned = item.returnedQuantity || 0;
              const maxReturnable = item.quantity - previouslyReturned;
              const isFullyReturned = maxReturnable <= 0;

              return (
              <div key={item.productId} className={`flex items-center justify-between p-2 rounded-md border ${isFullyReturned ? 'bg-muted/50 opacity-60' : ''}`}>
                <div className="flex items-center gap-4">
                    <Checkbox
                        id={`item-${item.productId}`}
                        checked={selectedItems[item.productId] !== undefined}
                        onCheckedChange={(checked) => handleCheckedChange(!!checked, item.productId)}
                        disabled={isFullyReturned}
                    />
                    <Label htmlFor={`item-${item.productId}`} className="flex flex-col">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Purchased: {item.quantity}
                          {previouslyReturned > 0 && `, Returned: ${previouslyReturned}`}
                        </span>
                    </Label>
                </div>
                <Input
                  type="number"
                  className="w-20"
                  value={selectedItems[item.productId] ?? ''}
                  onChange={e => handleQuantityChange(item.productId, parseInt(e.target.value, 10) || 0)}
                  placeholder="Qty"
                  disabled={selectedItems[item.productId] === undefined || isFullyReturned}
                  min="0"
                  max={maxReturnable}
                />
              </div>
            )})}
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={handleDialogClose}>Cancel</Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button disabled={isConfirmDisabled}>Confirm Return</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Return Process</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to process this return? This will update stock levels and cannot be easily undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirm}>Process Return</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
