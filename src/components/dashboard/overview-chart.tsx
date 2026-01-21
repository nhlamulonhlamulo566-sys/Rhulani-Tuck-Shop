'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Sale } from '@/lib/types';
import { useMemo } from 'react';
import { format } from 'date-fns';

interface OverviewChartProps {
  sales: Sale[] | null;
}

// Helper function to calculate the actual total after returns
const getAdjustedSaleTotal = (sale: Sale) => {
  const originalTotal = sale.total;
  
  // This check is for older sales that might not have the new structure
  if (!sale.items) return sale.total;

  const returnedValue = sale.items.reduce((acc, item) => {
    const returnedQty = item.returnedQuantity || 0;
    return acc + (returnedQty * item.price);
  }, 0);
  
  // Also need to adjust for tax if it was applied.
  // Assuming tax is proportional, we subtract the proportional tax on the returned value.
  const taxRate = (sale.subtotal && sale.subtotal > 0 && sale.tax) ? sale.tax / sale.subtotal : 0;
  const returnedTax = isNaN(taxRate) ? 0 : returnedValue * taxRate;

  return originalTotal - (returnedValue + returnedTax);
};

export function OverviewChart({ sales }: OverviewChartProps) {
  const data = useMemo(() => {
    if (!sales) return [];
    
    const monthlySales = Array.from({ length: 12 }, (_, i) => ({
      name: format(new Date(2024, i), 'MMM'),
      total: 0,
    }));

    // The sales prop is now pre-filtered, so we just need to aggregate
    sales.forEach(sale => {
      const monthIndex = new Date(sale.date).getMonth();
      const adjustedTotal = getAdjustedSaleTotal(sale);
      monthlySales[monthIndex].total += adjustedTotal;
    });

    return monthlySales;

  }, [sales]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Sales Overview</CardTitle>
        <CardDescription>A summary of sales activity over the current year, adjusted for returns.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 12, left: 12, bottom: 12 }}>
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `R${value}`}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              contentStyle={{
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
              }}
               formatter={(value: number) => [`R${value.toFixed(2)}`, 'Total']}
            />
            <Legend />
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
