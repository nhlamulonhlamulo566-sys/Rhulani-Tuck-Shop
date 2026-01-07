'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/lib/types';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export function StockTable() {
  const firestore = useFirestore();
  const productsQuery = useMemoFirebase(
    firestore ? collection(firestore, 'products') : null,
    'products',
    [firestore]
  );
  const { data: products, isLoading } = useCollection<Product>(productsQuery);

  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number | string>>({});
  const { toast } = useToast();

  const getStockStatus = (stock: number, lowStockThreshold: number) => {
    if (stock === 0) return 'Out of Stock';
    if (stock < lowStockThreshold) return 'Low Stock';
    return 'In Stock';
  };
  
  const getBadgeVariant = (stock: number, lowStockThreshold: number) => {
    if (stock === 0) return 'destructive';
    if (stock < lowStockThreshold) return 'secondary';
    return 'default';
  }

  const handleCountChange = (productId: string, value: string) => {
    setPhysicalCounts(prev => ({
      ...prev,
      [productId]: value === '' ? '' : parseInt(value, 10)
    }));
  };

  const handleUpdateStock = async () => {
    if (!firestore || !products) return;

    const batch = writeBatch(firestore);
    let updatesMade = false;

    products.forEach(product => {
      const physicalCount = physicalCounts[product.id];
      if (physicalCount !== undefined && physicalCount !== '' && !isNaN(Number(physicalCount)) && Number(physicalCount) !== product.stock) {
        const productRef = doc(firestore, 'products', product.id);
        batch.update(productRef, { stock: Number(physicalCount) });
        updatesMade = true;
      }
    });

    if (!updatesMade) {
        toast({
            title: "No Changes",
            description: "No stock counts were changed.",
        });
        return;
    }

    try {
        await batch.commit();
        setPhysicalCounts({});
        toast({
            title: "Stock Updated",
            description: "The stock levels have been successfully updated.",
        });
    } catch(e) {
        console.error("Stock update failed: ", e);
        const permissionError = new FirestorePermissionError({ path: 'batch-write', operation: 'update' });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not update stock levels. Please check permissions and try again.",
        });
    }
  };

  return (
    <>
      <PageHeader title="Stock Count">
        <Button onClick={handleUpdateStock}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Update Stock
        </Button>
      </PageHeader>
      <div className="border shadow-sm rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Physical Count</TableHead>
              <TableHead>Variance</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </TableCell>
                </TableRow>
            )}
            {!isLoading && products && products.map((product) => {
                const physicalCount = physicalCounts[product.id];
                const variance = (physicalCount !== undefined && physicalCount !== '') ? Number(physicalCount) - product.stock : 0;
              
                return (
                <TableRow key={product.id}>
                    <TableCell className="hidden sm:table-cell">
                    <Image
                        alt="Product image"
                        className="aspect-square rounded-md object-cover"
                        height="64"
                        src={product.imageUrl}
                        width="64"
                        data-ai-hint={product.imageHint}
                    />
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>
                        <Input
                            type="number"
                            className="w-24"
                            placeholder="Count..."
                            value={physicalCounts[product.id] ?? ''}
                            onChange={(e) => handleCountChange(product.id, e.target.value)}
                        />
                    </TableCell>
                    <TableCell className={variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-600' : ''}>
                        {variance > 0 ? `+${variance}`: variance}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(product.stock, product.lowStockThreshold)}>{getStockStatus(product.stock, product.lowStockThreshold)}</Badge>
                    </TableCell>
                </TableRow>
                )
            })}
             {!isLoading && (!products || products.length === 0) && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No products found. Add products to manage stock.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
