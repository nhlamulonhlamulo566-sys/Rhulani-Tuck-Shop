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
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useCollection } from '@/hooks/use-db-collection';

type ProductReorderInfo = {
  product: Product;
  salesLast30Days: number;
  priorityScore: number;
  dailySalesVelocity: number;
  daysOfStockRemaining: number;
  recommendedOrderQuantity: number;
};

export default function ReorderHubPage() {
  // 1. Fetch all sales and products
  const { data: sales, isLoading: salesLoading } = useCollection<Sale>('/api/sales');
  const { data: products, isLoading: productsLoading } = useCollection<Product>('/api/products');

  // 3. Process and rank products for reordering
  const reorderList = useMemo<ProductReorderInfo[]>(() => {
    if (!sales || !products) return [];

    const thirtyDaysAgo = subDays(new Date(), 30);

    // Calculate sales volume for each product from last 30 days
    const salesVolumeMap = new Map<string, number>();
    const validSales = sales.filter(s => {
      const saleDate = new Date(s.date);
      return (s.status === 'Completed' || s.status === 'Partially Returned') &&
             saleDate >= thirtyDaysAgo;
    });

    validSales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          const soldQty = item.quantity - (item.returnedQuantity || 0);
          if (soldQty > 0) {
            salesVolumeMap.set(item.productId, (salesVolumeMap.get(item.productId) || 0) + soldQty);
          }
        });
      }
    });

    // Filter for low stock products and calculate priority score
    const lowStockProducts = products
      .filter(p => p.stock <= p.lowStockThreshold)
      .map(product => {
        const salesLast30Days = salesVolumeMap.get(product.id) || 0;
        
        // Calculate daily sales velocity (units per day)
        const dailySalesVelocity = salesLast30Days > 0 ? salesLast30Days / 30 : 0;
        
        // Calculate days of stock remaining
        const daysOfStockRemaining = dailySalesVelocity > 0 
          ? Math.ceil(product.stock / dailySalesVelocity)
          : 999; // If no sales, consider it indefinite
        
        // Recommended order quantity: 30 days of sales + 10-unit buffer
        // Ensures at least 30 days of supply while maintaining some safety stock
        const recommendedOrderQuantity = Math.ceil((dailySalesVelocity * 30) + 10);
        
        // Priority Score: Higher for more sales and lower stock.
        // Adding 1 to stock to avoid division by zero.
        const priorityScore = salesLast30Days / (product.stock + 1);

        return {
          product,
          salesLast30Days,
          dailySalesVelocity,
          daysOfStockRemaining,
          recommendedOrderQuantity,
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
      <div className="space-y-6">
        {/* Information Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">📊 How Recommendations Work</CardTitle>
            <CardDescription className="text-blue-800">
              Our system analyzes 30-day sales data to predict your ordering needs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="font-semibold text-blue-900">📈 Daily Velocity</span>
                <p className="text-blue-700">Average units sold per day over the last 30 days</p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-blue-900">⏳ Days Remaining</span>
                <p className="text-blue-700">How long current stock will last at current sales rate</p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-blue-900">📦 Recommended Order</span>
                <p className="text-blue-700">30 days of sales + 10-unit safety buffer</p>
              </div>
            </div>
            <div className="border-t border-blue-200 pt-3 mt-3">
              <p className="text-blue-800 font-medium">💡 Example:</p>
              <p className="text-blue-700">If a product sells 10 units/day: Recommend ordering 310 units (10×30 days + 10 buffer)</p>
            </div>
          </CardContent>
        </Card>

        {/* Reorder List */}
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
                    <TableHead className="text-center">Daily Velocity</TableHead>
                    <TableHead className="text-center">Days Remaining</TableHead>
                    <TableHead className="text-center">Recommended Order</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                        </TableCell>
                    </TableRow>
                    ) : reorderList.length > 0 ? (
                    reorderList.map(({ product, salesLast30Days, dailySalesVelocity, daysOfStockRemaining, recommendedOrderQuantity }) => (
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
                        <TableCell className="text-center font-mono">{dailySalesVelocity.toFixed(2)}/day</TableCell>
                        <TableCell className="text-center font-mono">
                          {daysOfStockRemaining === 999 ? '∞' : `${daysOfStockRemaining}d`}
                        </TableCell>
                        <TableCell className="text-center font-bold text-blue-600">{recommendedOrderQuantity} units</TableCell>
                        <TableCell className="text-center">
                            <Badge variant={getBadgeVariant(product)}>{getStockStatus(product)}</Badge>
                        </TableCell>
                    </TableRow>
                    ))) : (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                            No products are currently low on stock.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
