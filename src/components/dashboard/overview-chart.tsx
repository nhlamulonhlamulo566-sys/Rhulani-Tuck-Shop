"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { Sale } from "@/lib/types";

interface OverviewChartProps {
    sales: Sale[] | null | undefined;
}

export function OverviewChart({ sales }: OverviewChartProps) {
    const data = Array.from({ length: 12 }, (_, i) => ({ name: new Date(0, i).toLocaleString('default', { month: 'short' }), total: 0 }));

    if (sales) {
        sales.forEach(sale => {
            const month = new Date(sale.date).getMonth();
            data[month].total += sale.total;
        });
    }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Sales Overview</CardTitle>
        <CardDescription>A summary of sales activity for the current year.</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
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
                borderRadius: 'var(--radius)'
              }}
              formatter={(value: number) => [`R${value.toFixed(2)}`, 'Total']}
            />
            <Legend formatter={() => 'Sales'}/>
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Sales" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
