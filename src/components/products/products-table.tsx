'use client';

import { useState, useMemo } from 'react';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/page-header';
import type { Product } from '@/lib/types';
import { ProductFormSheet } from './product-form-sheet';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

export function ProductsTable() {
  const firestore = useFirestore();
  const productsQuery = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);
  const { data: products, isLoading } = useCollection<Product>(productsQuery);
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

  const handleAddNew = () => {
    setEditingProduct(undefined);
    setIsSheetOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsSheetOpen(true);
  };

  const handleDelete = (productId: string) => {
    const productRef = doc(firestore, 'products', productId);
    deleteDocumentNonBlocking(productRef);
  };
  
  const handleSave = (data: any, currentProduct?: Product) => {
    if(currentProduct) {
      const productRef = doc(firestore, 'products', currentProduct.id);
      updateDocumentNonBlocking(productRef, data);
    } else {
      const newProductData = {
        imageUrl: data.imageUrl || `https://picsum.photos/seed/${Date.now()}/600/400`,
        imageHint: data.name.split(' ').slice(0, 2).join(' ') || 'product',
        ...data
      };
      const productsCollection = collection(firestore, 'products');
      addDocumentNonBlocking(productsCollection, newProductData);
    }
  }

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
                <TableCell>R{product.price.toFixed(2)}</TableCell>
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
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-red-600 w-full">
                                  Delete
                              </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the product
                                  and remove its data from our servers.
                              </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(product.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
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
    </>
  );
}
