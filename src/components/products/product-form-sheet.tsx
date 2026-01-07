'use client';

import { useState, useTransition, useRef } from 'react';
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
import { Wand2, Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateDescriptionAction } from '@/app/(dashboard)/products/actions';
import type { Product } from '@/lib/types';

const productFormSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters.'),
  category: z.string().min(2, 'Category must be at least 2 characters.'),
  price: z.coerce.number().positive('Price must be a positive number.'),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative.'),
  lowStockThreshold: z.coerce.number().int().min(0, 'Low stock threshold cannot be negative.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  imageUrl: z.string().optional().or(z.literal('')),
  barcodeEach: z.string().min(1, 'Barcode (Each) is required.'),
  barcodePack: z.string().optional(),
  barcodeCase: z.string().optional(),
  packSize: z.coerce.number().int().min(1),
  caseSize: z.coerce.number().int().min(1),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormSheetProps {
  product?: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ProductFormValues) => void;
}

export function ProductFormSheet({ product, open, onOpenChange, onSave }: ProductFormSheetProps) {
  const { toast } = useToast();
  const [isAiPending, startAiTransition] = useTransition();
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product
      ? {
          ...product,
          barcodeEach: product.barcodeEach || '',
          barcodePack: product.barcodePack || '',
          barcodeCase: product.barcodeCase || '',
        }
      : {
          name: '',
          category: '',
          price: 0,
          stock: 0,
          lowStockThreshold: 10,
          description: '',
          imageUrl: '',
          barcodeEach: '',
          barcodePack: '',
          barcodeCase: '',
          packSize: 6,
          caseSize: 24,
        },
  });

  const handleGenerateDescription = () => {
    const productName = form.getValues('name');
    const productCategory = form.getValues('category');

    if (!productName || !productCategory) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide a product name and category to generate a description.',
      });
      return;
    }

    startAiTransition(async () => {
      const { description: newDescription, error } = await generateDescriptionAction({
        productName,
        productCategory,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'AI Generation Failed',
          description: error,
        });
      } else if (newDescription) {
        form.setValue('description', newDescription, { shouldValidate: true });
        toast({
          title: 'Description Generated',
          description: 'The AI has successfully generated a product description.',
        });
      }
    });
  };
  
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
    onSave(data);
    onOpenChange(false);
    setImagePreview(null);
  };
  
  // Reset image preview when sheet is closed without saving
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset(product ? { ...product } : undefined);
      setImagePreview(product?.imageUrl || null);
    }
    onOpenChange(isOpen);
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-8">
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
              name="barcodeEach"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode (Each)</FormLabel>
                  <FormControl>
                    <Input placeholder="Barcode for a single item" {...field} />
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
                    <FormLabel>Barcode (Pack of {form.watch('packSize') || 1})</FormLabel>
                    <FormControl>
                      <Input placeholder="Barcode for a pack/shrink" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                  control={form.control}
                  name="packSize"
                  render={({ field }) => (
                    <FormItem className="w-1/4">
                      <FormLabel>Pack Size</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
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
                      <FormLabel>Barcode (Case of {form.watch('caseSize') || 1})</FormLabel>
                      <FormControl>
                        <Input placeholder="Barcode for a full case" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="caseSize"
                  render={({ field }) => (
                    <FormItem className="w-1/4">
                      <FormLabel>Case Size</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
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
                      <Input type="number" step="0.01" placeholder="9.99" {...field} />
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
                      <Input type="number" placeholder="100" {...field} />
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateDescription}
                      disabled={isAiPending}
                    >
                      {isAiPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="mr-2 h-4 w-4" />
                      )}
                      Generate with AI
                    </Button>
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
