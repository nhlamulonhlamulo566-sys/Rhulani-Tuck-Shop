'use client';

import { useState, useId } from 'react';
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
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export function ProductsTable() {
  const firestore = useFirestore();
  const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore], 'products');
  const { data: products, isLoading, error } = useCollection<Product>(productsQuery);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const uniqueId = useId();
  const { toast } = useToast();

  const handleAddNew = () => {
    setEditingProduct(undefined);
    setIsSheetOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsSheetOpen(true);
  };

  const handleDelete = (productId: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, "products", productId))
        .then(() => {
            toast({
                title: "Product Deleted",
                description: "The product has been removed successfully.",
            });
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: `products/${productId}`, operation: 'delete' });
            errorEmitter.emit('permission-error', permissionError);
            toast({
              variant: "destructive",
              title: "Deletion Failed",
              description: 'Could not delete product. Check permissions.',
            });
        });
  };
  
  const handleSave = (data: any) => {
    if (!firestore) return;
    
    const productData = { ...data };

    if(editingProduct) {
      const productRef = doc(firestore, 'products', editingProduct.id);
      setDoc(productRef, productData, { merge: true })
        .then(() => {
          toast({
            title: "Product Updated",
            description: `${data.name} has been updated.`,
          });
        })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({ path: productRef.path, operation: 'update' });
          errorEmitter.emit('permission-error', permissionError);
          toast({
            variant: "destructive",
            title: "Update Failed",
            description: 'Could not update product. Check permissions.',
          });
        });
    } else {
      const newProduct: Omit<Product, 'id'> = {
        imageUrl: data.imageUrl || `https://picsum.photos/seed/${Date.now()}/600/400`,
        imageHint: data.name.split(' ').slice(0, 2).join(' ') || 'product',
        ...productData
      };
      const productsCollection = collection(firestore, 'products');
      addDoc(productsCollection, newProduct)
        .then(() => {
          toast({
            title: "Product Added",
            description: `${data.name} has been added to your inventory.`,
          });
        })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({ path: productsCollection.path, operation: 'create' });
          errorEmitter.emit('permission-error', permissionError);
           toast({
            variant: "destructive",
            title: "Creation Failed",
            description: 'Could not add product. Check permissions.',
          });
        });
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
              <TableHead>Barcode (Each)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Stock</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && products && products.map((product) => (
              <TableRow key={`${uniqueId}-${product.id}`}>
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
                <TableCell className="font-mono text-xs">{product.barcodeEach}</TableCell>
                <TableCell>
                   <Badge variant={getBadgeVariant(product)}>{getStockStatus(product)}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{product.stock}</TableCell>
                <TableCell>R{product.price.toFixed(2)}</TableCell>
                <TableCell>
                  <AlertDialog>
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
                        <AlertDialogTrigger asChild>
                           <DropdownMenuItem className="text-red-600" onSelect={e => e.preventDefault()}>
                              Delete
                           </DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>
                     <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the product
                          <span className="font-semibold"> {product.name}</span>.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(product.id)}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
             {!isLoading && (!products || products.length === 0) && (
                <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No products found. Add your first product to get started.
                    </TableCell>
                </TableRow>
            )}
             {error && (
                <TableRow>
                    <TableCell colSpan={7} className="text-center text-destructive">
                        Error loading products: {error.message}
                    </TableCell>
                </TableRow>
            )}
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
