'use client';

import { DollarSign, Package, ShoppingCart, Activity, Loader2 } from 'lucide-react';
import PageHeader from '@/components/page-header';
import SummaryCard from '@/components/dashboard/summary-card';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import { RecentSales } from '@/components/dashboard/recent-sales';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Sale, Product, UserProfile } from '@/lib/types';
import { useMemo } from 'react';

// Helper function to calculate the actual total after returns
const getAdjustedSaleTotal = (sale: Sale) => {
  const originalTotal = sale.total;
  
  if (!sale.items) return sale.total;

  const returnedValue = sale.items.reduce((acc, item) => {
    const returnedQty = item.returnedQuantity || 0;
    return acc + (returnedQty * item.price);
  }, 0);
  
  const taxRate = (sale.subtotal && sale.subtotal > 0 && sale.tax) ? sale.tax / sale.subtotal : 0;
  const returnedTax = isNaN(taxRate) ? 0 : returnedValue * taxRate;

  return originalTotal - (returnedValue + returnedTax);
};


export default function DashboardPage() {
  const { user } = useUser() as { user: UserProfile | null };
  const firestore = useFirestore();

  // SECURITY FIX: Query sales based on user role.
  // Admins see all sales, Sales roles see only their own.
  const salesQuery = useMemoFirebase(() => {
    if (!user) return null;
    
    const salesCollection = collection(firestore, 'sales');
    if (user.role === 'Administration' || user.role === 'Super Administration') {
      return query(salesCollection);
    }
    // For 'Sales' role, only fetch their own sales
    return query(salesCollection, where('userId', '==', user.id));
  }, [firestore, user]);
  
  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);

  const productsQuery = useMemoFirebase(
    () => query(collection(firestore, 'products')),
    [firestore]
  );
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);

  const dashboardData = useMemo(() => {
    if (!sales || !products) {
      return {
        totalRevenue: 0,
        totalSales: 0,
        productsInStock: 0,
        activeSales: [],
      };
    }
    
    // Filter out voided or fully returned sales for all calculations
    const activeSales = sales.filter(sale => sale.status === 'Completed' || sale.status === 'Partially Returned');

    const totalRevenue = activeSales.reduce((acc, sale) => acc + getAdjustedSaleTotal(sale), 0);
    const productsInStock = products.filter((p) => p.stock > 0).length;

    return {
      totalRevenue,
      totalSales: activeSales.length,
      productsInStock,
      activeSales,
    };
  }, [sales, products]);
  
  const isLoading = salesLoading || productsLoading;

  if (isLoading) {
    return (
       <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Dashboard" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard 
          title="Total Revenue" 
          value={`R${dashboardData.totalRevenue.toFixed(2)}`} 
          icon={DollarSign} 
        />
        <SummaryCard 
          title="Sales" 
          value={`+${dashboardData.totalSales}`} 
          icon={ShoppingCart} 
        />
        <SummaryCard 
          title="Products in Stock" 
          value={`${dashboardData.productsInStock}`} 
          icon={Package} 
        />
        <SummaryCard 
            title="Active Now" 
            value="+1" 
            change="Just you for now!" 
            icon={Activity} />
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 mt-6 flex-1 min-h-0">
        <div className="lg:col-span-2 min-h-0 h-[420px]">
          <OverviewChart sales={dashboardData.activeSales} />
        </div>
        <div className="min-h-0 h-[420px]">
          <RecentSales products={products} />
        </div>
      </div>
    </div>
  );
}

    