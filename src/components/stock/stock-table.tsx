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
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

type StockCount = {
  productId: string;
  physicalCount: number;
};

interface StockTableProps {
  onCountChange: (productId: string, count: number) => void;
  stockCounts: StockCount[];
}

export function StockTable({ onCountChange, stockCounts }: StockTableProps) {
  const firestore = useFirestore();
  const productsQuery = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);
  const { data: products, isLoading } = useCollection<Product>(productsQuery);

  const getStockStatus = (stock: number, lowStockThreshold: number) => {
    if (stock === 0) return 'Out of Stock';
    if (stock < lowStockThreshold) return 'Low Stock';
    return 'In Stock';
  };

  const getBadgeVariant = (stock: number, lowStockThreshold: number) => {
    if (stock === 0) return 'destructive';
    if (stock < lowStockThreshold) return 'secondary';
    return 'default';
  };
  
  const getVarianceColor = (variance: number) => {
    if (variance < 0) return 'text-red-600';
    if (variance > 0) return 'text-green-600';
    return 'text-muted-foreground';
  }

  return (
    <div className="border shadow-sm rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-center">Current Stock</TableHead>
            <TableHead className="w-[150px]">Physical Count</TableHead>
            <TableHead className="text-center">Variance</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center h-24">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              </TableCell>
            </TableRow>
          ) : (
            products?.map((product) => {
              const countEntry = stockCounts.find(sc => sc.productId === product.id);
              const physicalCount = countEntry?.physicalCount;
              const variance = physicalCount !== undefined ? physicalCount - product.stock : 0;

              return (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-4">
                      <Image
                        alt={product.name}
                        className="aspect-square rounded-md object-contain"
                        height="40"
                        src={product.imageUrl}
                        width="40"
                        data-ai-hint={product.imageHint}
                      />
                      <span>{product.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono">{product.stock}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="Count..."
                      className="text-center"
                      value={physicalCount === undefined ? '' : physicalCount}
                      onChange={(e) => onCountChange(product.id, parseInt(e.target.value, 10))}
                    />
                  </TableCell>
                  <TableCell className={`text-center font-bold ${getVarianceColor(variance)}`}>
                    {variance}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getBadgeVariant(product.stock, product.lowStockThreshold)}>
                      {getStockStatus(product.stock, product.lowStockThreshold)}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
