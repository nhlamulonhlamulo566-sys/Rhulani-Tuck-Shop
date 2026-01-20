'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Upload } from 'lucide-react';
import type { Product } from '@/lib/types';

const productFormSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters.'),
  barcode: z.string().optional(),
  barcodePack: z.string().optional(),
  packSize: z.coerce.number().int().min(0).optional(),
  barcodeCase: z.string().optional(),
  caseSize: z.coerce.number().int().min(0).optional(),
  category: z.string().min(2, 'Category must be at least 2 characters.'),
  price: z.coerce.number().positive('Price must be a positive number.'),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative.'),
  lowStockThreshold: z.coerce.number().int().min(0, 'Low stock threshold cannot be negative.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  imageUrl: z.string().optional().or(z.literal('')),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormSheetProps {
  product?: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ProductFormValues, currentProduct?: Product) => void;
}

const getInitialValues = (product?: Product): ProductFormValues => {
    return product
      ? {
          name: product.name,
          category: product.category,
          price: product.price,
          stock: product.stock,
          lowStockThreshold: product.lowStockThreshold,
          description: product.description,
          imageUrl: product.imageUrl,
          barcode: product.barcode || '',
          barcodePack: product.barcodePack || '',
          packSize: product.packSize ?? 0,
          barcodeCase: product.barcodeCase || '',
          caseSize: product.caseSize ?? 0,
        }
      : {
          name: '',
          category: '',
          price: 0,
          stock: 0,
          lowStockThreshold: 10,
          description: '',
          imageUrl: '',
          barcode: '',
          barcodePack: '',
          packSize: 0,
          barcodeCase: '',
          caseSize: 0,
        };
}

export function ProductFormSheet({ product, open, onOpenChange, onSave }: ProductFormSheetProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: getInitialValues(product),
  });
  
  useEffect(() => {
    if (open) {
      const initialValues = getInitialValues(product);
      form.reset(initialValues);
      setImagePreview(initialValues.imageUrl || null);
    }
  }, [open, product, form]);

  
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImagePreview(dataUrl);
        form.setValue('imageUrl', dataUrl, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: ProductFormValues) => {
    onSave(data, product);
    handleOpenChange(false);
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      form.reset(getInitialValues(undefined));
      setImagePreview(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-lg w-[90vw] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{product ? 'Edit Product' : 'Add New Product'}</SheetTitle>
          <SheetDescription>
            {product
              ? "Update the details of your product."
              : "Fill in the details for the new product."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Fizzy Drink Can" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode (Each)</FormLabel>
                  <FormControl>
                    <Input placeholder="Barcode for a single item" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex space-x-4">
              <FormField
                control={form.control}
                name="barcodePack"
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormLabel>Barcode (Pack)</FormLabel>
                    <FormControl>
                      <Input placeholder="Barcode for a pack/shrink" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="packSize"
                render={({ field }) => (
                  <FormItem className="w-24">
                    <FormLabel>Pack Size</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} value={field.value ?? 0} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <div className="flex space-x-4">
              <FormField
                control={form.control}
                name="barcodeCase"
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormLabel>Barcode (Case)</FormLabel>
                    <FormControl>
                      <Input placeholder="Barcode for a full case" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="caseSize"
                render={({ field }) => (
                  <FormItem className="w-24">
                    <FormLabel>Case Size</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} value={field.value ?? 0}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Beverages" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex space-x-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem className="w-1/2">
                    <FormLabel>Price (per Each)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem className="w-1/2">
                    <FormLabel>Total Stock (Units)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="lowStockThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Low Stock Threshold (Units)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Description</FormLabel>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="A detailed description of the product."
                      className="resize-y min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
              <FormLabel>Product Image</FormLabel>
              <FormControl>
                <div 
                  className="relative flex justify-center items-center w-full h-48 border-2 border-dashed border-muted-foreground/50 rounded-lg cursor-pointer hover:bg-muted"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  {imagePreview ? (
                     <Image src={imagePreview} alt="Product preview" fill style={{ objectFit: 'cover' }} className="rounded-lg" />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Upload className="mx-auto h-8 w-8" />
                      <p>Click or drag file to this area to upload</p>
                    </div>
                  )}
                </div>
              </FormControl>
               <FormMessage>{form.formState.errors.imageUrl?.message}</FormMessage>
            </FormItem>
            
            <SheetFooter>
                <SheetClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </SheetClose>
                <Button type="submit">Save Product</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
