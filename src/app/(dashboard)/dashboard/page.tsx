'use client';
import { DollarSign, Package, Users, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/page-header';
import SummaryCard from '@/components/dashboard/summary-card';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import { RecentSales } from '@/components/dashboard/recent-sales';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { collection } from 'firebase/firestore';
import type { Sale, Product } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const salesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sales');
  }, [firestore], 'sales');

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'products');
  }, [firestore], 'products');

  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const totalRevenue = useMemo(() => {
    if (!sales) return 0;
    const completedSales = sales.filter(s => s.status === 'completed');
    return completedSales.reduce((acc, sale) => acc + sale.total, 0);
  }, [sales]);

  const totalSales = useMemo(() => {
    if (!sales) return 0;
    return sales.filter(s => s.status === 'completed').length;
  }, [sales]);

  const productsInStock = useMemo(() => {
    if (!products) return 0;
    return products.reduce((acc, product) => acc + product.stock, 0);
  }, [products]);

  const lowStockProducts = useMemo(() => {
    if (!products) return 0;
    return products.filter(p => p.stock > 0 && p.stock < p.lowStockThreshold).length;
  }, [products]);


  const loading = userLoading || salesLoading || productsLoading;

  if (loading || !user) {
    return (
       <div className="flex items-center justify-center h-full">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
       </div>
    )
  }

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard 
          title="Total Revenue" 
          value={`R${totalRevenue.toFixed(2)}`} 
          icon={DollarSign} 
        />
        <SummaryCard 
          title="Total Sales" 
          value={`+${totalSales}`} 
          icon={Users} 
        />
        <SummaryCard 
          title="Products in Stock" 
          value={`${productsInStock}`} 
          icon={Package} 
        />
        <SummaryCard 
          title="Low Stock Alerts" 
          value={`${lowStockProducts}`} 
          icon={AlertTriangle} 
          variant={lowStockProducts > 0 ? 'destructive' : 'default'}
        />
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 mt-6">
        <OverviewChart sales={sales?.filter(s => s.status === 'completed')} />
        <RecentSales />
      </div>
    </>
  );
}
