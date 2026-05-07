'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MoreHorizontal, PlusCircle, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/page-header';
import type { Product } from '@/lib/types';
import { toMoney } from '@/lib/format-utils';
import { ProductFormSheet } from './product-form-sheet';
import { useCollection } from '@/hooks/use-db-collection';

export function ProductsTable() {
  const { data: products, isLoading, error, refetch } = useCollection<Product>('/api/products');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const handleAddNew = () => {
    setEditingProduct(undefined);
    setIsSheetOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsSheetOpen(true);
  };

  const handleDelete = async (productId: string) => {
    try {
      setDeletingProduct(null); // Close dialog immediately
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to delete product');
      }

      toast({
        title: 'Success',
        description: payload?.message || 'Product deleted successfully',
      });
      refetch();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete product',
      });
    }
  };
  
  const handleSave = async (data: any, currentProduct?: Product) => {
    try {
      if (currentProduct) {
        const payloadToUpdate = {
          ...data,
          imageHint:
            currentProduct.imageHint || data.name.split(' ').slice(0, 2).join(' ') || 'product',
        };

        const response = await fetch(`/api/products/${currentProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadToUpdate),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to update product');
        }

        toast({
          title: 'Success',
          description: payload?.message || 'Product updated successfully',
        });
      } else {
        const newProductData = {
          imageUrl: data.imageUrl || `https://picsum.photos/seed/${Date.now()}/600/400`,
          imageHint: data.name.split(' ').slice(0, 2).join(' ') || 'product',
          ...data,
        };

        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProductData),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to create product');
        }

        toast({
          title: 'Success',
          description: payload?.message || 'Product created successfully',
        });
      }

      refetch();
      setIsSheetOpen(false);
      return true;
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An error occurred',
      });
      return false;
    }
  };

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
      <PageHeader title="Products">
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Product
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
              <TableHead>Barcode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Stock</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                </TableCell>
              </TableRow>
            ) : (
              products?.map((product) => (
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
                <TableCell className="font-mono text-xs">{product.barcode}</TableCell>
                <TableCell>
                   <Badge variant={getBadgeVariant(product)}>{getStockStatus(product)}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{product.stock}</TableCell>
                <TableCell>R{toMoney(product.price)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => handleEdit(product)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setDeletingProduct(product)} className="text-destructive">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )))}
          </TableBody>
        </Table>
      </div>
      <ProductFormSheet 
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        product={editingProduct}
        onSave={handleSave}
      />

      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => { if (!open) setDeletingProduct(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The product will be removed from inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingProduct && handleDelete(deletingProduct.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
