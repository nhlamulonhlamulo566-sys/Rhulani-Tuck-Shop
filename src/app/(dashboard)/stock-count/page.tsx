'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Check } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { StockTable } from '@/components/stock/stock-table';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/lib/types';

type StockCount = {
  productId: string;
  physicalCount: number;
};

export default function StockCountPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [stockCounts, setStockCounts] = useState<StockCount[]>([]);

  const handleCountChange = (productId: string, count: number) => {
    setStockCounts((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId ? { ...item, physicalCount: count } : item
        );
      }
      return [...prev, { productId, physicalCount: count }];
    });
  };

  const handleUpdateStock = () => {
    setIsUpdating(true);
    try {
      const updates = stockCounts.filter(
        (item) => !isNaN(item.physicalCount) && item.physicalCount >= 0
      );
      
      if (updates.length === 0) {
        toast({
          title: 'No Changes to Update',
          description: 'You have not entered any new stock counts.',
        });
        return;
      }

      updates.forEach((item) => {
        const productRef = doc(firestore, 'products', item.productId);
        updateDocumentNonBlocking(productRef, { stock: item.physicalCount });
      });

      toast({
        title: 'Stock Update Initiated',
        description: `${updates.length} product(s) are being updated in the background.`,
      });
      
      // Reset counts after updating
      setStockCounts([]);

    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'An unexpected error occurred while updating stock.',
      });
    } finally {
        setIsUpdating(false);
    }
  };

  return (
    <>
      <PageHeader title="Stock Count">
        <Button onClick={handleUpdateStock} disabled={isUpdating}>
          {isUpdating ? <Loader2 className="mr-2" /> : <Check className="mr-2" />}
          Update Stock
        </Button>
      </PageHeader>
      <StockTable onCountChange={handleCountChange} stockCounts={stockCounts} />
    </>
  );
}
