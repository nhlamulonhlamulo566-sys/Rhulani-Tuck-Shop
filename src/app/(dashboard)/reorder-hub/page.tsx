'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import PageHeader from '@/components/page-header';
import type { Sale, Product } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';

type ProductReorderInfo = {
  product: Product;
  salesLast30Days: number;
  priorityScore: number;
};

export default function ReorderHubPage() {
  const firestore = useFirestore();
  
  // 1. Fetch sales from the last 30 days
  const salesQuery = useMemoFirebase(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    return query(
      collection(firestore, 'sales'),
      where('date', '>=', thirtyDaysAgo.toISOString())
    );
  }, [firestore]);
  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);
  
  // 2. Fetch all products
  const productsQuery = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);

  // 3. Process and rank products for reordering
  const reorderList = useMemo<ProductReorderInfo[]>(() => {
    if (!sales || !products) return [];

    // Calculate sales volume for each product
    const salesVolumeMap = new Map<string, number>();
    const validSales = sales.filter(s => s.status === 'Completed' || s.status === 'Partially Returned');

    validSales.forEach(sale => {
      sale.items.forEach(item => {
        const soldQty = item.quantity - (item.returnedQuantity || 0);
        if (soldQty > 0) {
          salesVolumeMap.set(item.productId, (salesVolumeMap.get(item.productId) || 0) + soldQty);
        }
      });
    });

    // Filter for low stock products and calculate priority score
    const lowStockProducts = products
      .filter(p => p.stock <= p.lowStockThreshold)
      .map(product => {
        const salesLast30Days = salesVolumeMap.get(product.id) || 0;
        
        // Priority Score: Higher for more sales and lower stock.
        // Adding 1 to stock to avoid division by zero.
        const priorityScore = salesLast30Days / (product.stock + 1);

        return {
          product,
          salesLast30Days,
          priorityScore,
        };
      });

    // Sort by priority score in descending order
    return lowStockProducts.sort((a, b) => b.priorityScore - a.priorityScore);

  }, [sales, products]);

  const isLoading = salesLoading || productsLoading;
  
  const getStockStatus = (product: Product) => {
    if (product.stock === 0) return 'Out of Stock';
    if (product.stock < product.lowStockThreshold) return 'Low Stock';
    return 'In Stock';
  };
  
  const getBadgeVariant = (product: Product) => {
    if (product.stock === 0) return 'destructive';
    if (product.stock < product.lowStockThreshold) return 'secondary';
    return 'default';
  }

  return (
    <>
      <PageHeader title="Reorder Hub" />
      <Card>
        <CardHeader>
            <CardTitle>Prioritized Reorder List</CardTitle>
            <CardDescription>Products running low on stock, prioritized by recent sales activity.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="border rounded-lg">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Current Stock</TableHead>
                    <TableHead className="text-center">30-Day Sales</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                        </TableCell>
                    </TableRow>
                    ) : reorderList.length > 0 ? (
                    reorderList.map(({ product, salesLast30Days }) => (
                    <TableRow key={product.id}>
                        <TableCell className="font-medium">
                           <div className="flex items-center gap-4">
                                <Image
                                    alt={product.name}
                                    className="aspect-square rounded-md object-cover"
                                    height="40"
                                    src={product.imageUrl}
                                    width="40"
                                    data-ai-hint={product.imageHint}
                                />
                                <span>{product.name}</span>
                           </div>
                        </TableCell>
                        <TableCell className="text-center font-mono">{product.stock}</TableCell>
                        <TableCell className="text-center font-mono">{salesLast30Days}</TableCell>
                        <TableCell className="text-center">
                            <Badge variant={getBadgeVariant(product)}>{getStockStatus(product)}</Badge>
                        </TableCell>
                    </TableRow>
                    ))) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                            No products are currently low on stock.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </>
  );
}
