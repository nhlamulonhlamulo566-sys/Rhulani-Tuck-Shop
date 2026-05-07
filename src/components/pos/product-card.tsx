import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Product } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toMoney } from '@/lib/format-utils';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  // Use a default placeholder if imageUrl is empty
  const imageUrl = product.imageUrl && product.imageUrl.trim() ? product.imageUrl : `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=250&fit=crop`;

  return (
    <Card className={`flex flex-col relative ${isOutOfStock ? 'opacity-50' : ''}`}>
      {isOutOfStock && (
        <Badge variant="destructive" className="absolute top-2 right-2 z-10">
          Out of Stock
        </Badge>
      )}
      <CardHeader className="p-0">
        <Image
          src={imageUrl}
          alt={product.name}
          width={400}
          height={250}
          className="aspect-video w-full object-cover rounded-t-lg"
          onError={(e) => {
            // Fallback if image fails to load
            const img = e.target as HTMLImageElement;
            img.src = `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=250&fit=crop`;
          }}
        />
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-lg font-semibold mb-1">{product.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{product.category}</p>
      </CardContent>
      <CardFooter className="p-4 flex justify-between items-center">
        <p className="text-lg font-bold">R{toMoney(product.price)}</p>
        <Button size="sm" onClick={() => onAddToCart(product)} disabled={isOutOfStock}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}
