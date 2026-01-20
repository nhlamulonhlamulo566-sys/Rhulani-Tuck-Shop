'use client';

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Sale, Product } from "@/lib/types";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";
import { startOfMonth, endOfMonth } from 'date-fns';
import { ScrollArea } from "../ui/scroll-area";

interface RecentSalesProps {
  products: Product[] | null;
}

export function RecentSales({ products }: RecentSalesProps) {
  const firestore = useFirestore();

  const salesQuery = useMemoFirebase(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    
    return query(
      collection(firestore, 'sales'),
      where('date', '>=', start.toISOString()),
      where('date', '<=', end.toISOString()),
      orderBy('date', 'desc')
    );
  }, [firestore]);
  
  const { data: monthlySales, isLoading } = useCollection<Sale>(salesQuery);

  const recentSales = useMemo(() => {
    if (!monthlySales) return [];
    return monthlySales.filter(sale => sale.status === 'Completed' || sale.status === 'Partially Returned');
  }, [monthlySales]);

  const getProductImage = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    return product?.imageUrl;
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>This Month's Sales</CardTitle>
        <CardDescription>All valid sales recorded this month.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full">
            <div className="space-y-6 p-6">
            {isLoading ? (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            ) : recentSales && recentSales.length > 0 ? (
            recentSales.map((sale) => {
                const firstItem = sale.items[0];
                const imageUrl = firstItem ? getProductImage(firstItem.productId) : null;
                return (
                <div key={sale.id} className="flex items-center gap-4">
                    <Avatar className="hidden h-9 w-9 sm:flex">
                    {imageUrl ? (
                        <Image src={imageUrl} alt={firstItem?.name || 'Product'} width={36} height={36} className="object-cover rounded-full" />
                    ) : (
                        <AvatarFallback>{(sale.salesperson || 'S').charAt(0)}</AvatarFallback>
                    )}
                    </Avatar>
                    <div className="grid gap-1">
                    <p className="text-sm font-medium leading-none">{sale.salesperson}</p>
                    <p className="text-sm text-muted-foreground">
                        {firstItem?.name}{sale.items.length > 1 ? ` & ${sale.items.length - 1} more` : ''}
                    </p>
                    </div>
                    <div className="ml-auto font-medium">+R{sale.total.toFixed(2)}</div>
                </div>
                );
            })
            ) : (
            <p className="text-sm text-muted-foreground text-center">No sales recorded this month yet.</p>
            )}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
