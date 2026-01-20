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
import { startOfMonth, endOfMonth } from 'date-fns';

type ProductPerformance = {
  productId: string;
  name: string;
  category: string;
  imageUrl: string;
  imageHint: string;
  totalSold: number;
  totalRevenue: number;
};

export default function TopSellingProducts() {
  const firestore = useFirestore();
  
  const salesQuery = useMemoFirebase(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    
    return query(
      collection(firestore, 'sales'),
      where('date', '>=', start.toISOString()),
      where('date', '<=', end.toISOString()),
    );
  }, [firestore]);
  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);
  
  const productsQuery = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);

  const productPerformance = useMemo<ProductPerformance[]>(() => {
    if (!sales || !products) return [];

    const performanceMap = new Map<string, ProductPerformance>();

    // Initialize map with all products
    products.forEach(p => {
      performanceMap.set(p.id, {
        productId: p.id,
        name: p.name,
        category: p.category,
        imageUrl: p.imageUrl,
        imageHint: p.imageHint,
        totalSold: 0,
        totalRevenue: 0,
      });
    });

    const validSales = sales.filter(s => s.status === 'Completed' || s.status === 'Partially Returned');

    validSales.forEach(sale => {
      sale.items.forEach(item => {
        const productInfo = performanceMap.get(item.productId);
        if (productInfo) {
          const soldQty = item.quantity - (item.returnedQuantity || 0);
          if (soldQty > 0) {
            productInfo.totalSold += soldQty;
            productInfo.totalRevenue += soldQty * item.price;
          }
        }
      });
    });

    // Sort by total units sold in descending order
    return Array.from(performanceMap.values()).sort((a, b) => b.totalSold - a.totalSold);

  }, [sales, products]);

  const isLoading = salesLoading || productsLoading;

  return (
    <>
      <PageHeader title="Product Performance Report" />
      <Card>
        <CardHeader>
            <CardTitle>This Month's Top Selling Products</CardTitle>
            <CardDescription>Products ranked by total units sold for the current month, adjusted for returns.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="h-[400px] overflow-y-auto border rounded-lg">
                <Table>
                <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                    <TableHead className="hidden w-[100px] sm:table-cell">
                        <span className="sr-only">Image</span>
                    </TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Units Sold</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                        </TableCell>
                    </TableRow>
                    ) : productPerformance.length > 0 ? (
                    productPerformance.map((product) => (
                    <TableRow key={product.productId}>
                        <TableCell className="hidden sm:table-cell">
                        <Image
                            alt={product.name}
                            className="aspect-square rounded-md object-cover"
                            height="64"
                            src={product.imageUrl}
                            width="64"
                            data-ai-hint={product.imageHint}
                        />
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell className="text-right font-semibold">{product.totalSold}</TableCell>
                        <TableCell className="text-right">R{product.totalRevenue.toFixed(2)}</TableCell>
                    </TableRow>
                    ))) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                            No sales data available for this month.
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
