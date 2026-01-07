'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { Sale } from "@/lib/types";
import { collection, limit, orderBy, query } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export function RecentSales() {
  const firestore = useFirestore();
  const salesQuery = useMemoFirebase(
    firestore ? query(collection(firestore, 'sales'), orderBy('date', 'desc'), limit(5)) : null,
    'recent-sales',
    [firestore]
  );
  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);

  const loading = salesLoading;

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Recent Sales</CardTitle>
        <CardDescription>Your 5 most recent sales.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8">
        {loading && (
          <div className="flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!loading && sales && sales.map((sale) => {
          const firstItem = sale.items[0];
          const imageUrl = firstItem?.imageUrl || '';
          const imageHint = firstItem?.imageHint || '';

          return (
            <div key={sale.id} className="flex items-center gap-4">
              <Avatar className="hidden h-9 w-9 sm:flex">
                {imageUrl && <AvatarImage src={imageUrl} alt="Product image" data-ai-hint={imageHint} />}
                <AvatarFallback>{sale.customerName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">{sale.customerName}</p>
                <p className="text-sm text-muted-foreground">
                  {firstItem.productName}{sale.items.length > 1 ? ` & ${sale.items.length - 1} more` : ''}
                </p>
              </div>
              <div className="ml-auto font-medium">+R{sale.total.toFixed(2)}</div>
            </div>
          );
        })}
         {!loading && (!sales || sales.length === 0) && (
            <p className="text-sm text-muted-foreground text-center">No sales have been made yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
