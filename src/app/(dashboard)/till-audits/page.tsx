'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import PageHeader from '@/components/page-header';
import type { TillSession, Sale } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Loader2, TrendingUp, TrendingDown, Minus, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, startOfToday, endOfToday } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return 'R0.00';
    return `R${amount.toFixed(2)}`;
}

export default function TillAuditsPage() {
  const firestore = useFirestore();

  const sessionsQuery = useMemoFirebase(() => {
    return query(
      collection(firestore, 'tillSessions'),
      where('status', '==', 'Closed')
    );
  }, [firestore]);

  const { data: sessionsUnsorted, isLoading } = useCollection<TillSession>(sessionsQuery);
  
  const salesQuery = useMemoFirebase(() => {
    const today = startOfToday();
    const endOfTodayDate = endOfToday();
    return query(
      collection(firestore, 'sales'),
      where('date', '>=', today.toISOString()),
      where('date', '<=', endOfTodayDate.toISOString()),
      where('status', '==', 'Completed')
    );
  }, [firestore]);

  const { data: todaySales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);
  
  const sessions = useMemo(() => {
    if (!sessionsUnsorted) return null;
    return [...sessionsUnsorted].sort((a, b) => {
      const aDate = a.endDate ? new Date(a.endDate).getTime() : 0;
      const bDate = b.endDate ? new Date(b.endDate).getTime() : 0;
      return bDate - aDate;
    });
  }, [sessionsUnsorted]);

  const salesBySalesperson = useMemo(() => {
    if (!todaySales) return {};
    const summary: Record<string, { netSales: number; count: number }> = {};
    
    todaySales.forEach(sale => {
      if (!summary[sale.salesperson]) {
        summary[sale.salesperson] = { netSales: 0, count: 0 };
      }
      summary[sale.salesperson].netSales += sale.total;
      summary[sale.salesperson].count += 1;
    });
    
    return summary;
  }, [todaySales]);
  
  const getDifferenceVariant = (difference: number = 0) => {
    if (difference < 0) return 'destructive';
    if (difference > 0) return 'default';
    return 'secondary';
  }
  
  const DifferenceBadge = ({ difference = 0 }: { difference: number | undefined }) => {
    if (difference === undefined) return null;
    
    const variant = getDifferenceVariant(difference);
    const Icon = difference < 0 ? TrendingDown : difference > 0 ? TrendingUp : Minus;

    return (
        <Badge variant={variant} className="flex items-center gap-1">
            <Icon className="h-3 w-3" />
            <span>{formatCurrency(difference)}</span>
        </Badge>
    );
  }

  return (
    <>
      <PageHeader title="Till Audits" />
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            Net Sales for Today
          </CardTitle>
          <CardDescription>Daily sales summary by salesperson</CardDescription>
        </CardHeader>
        <CardContent>
          {salesLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : Object.keys(salesBySalesperson).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(salesBySalesperson).map(([salesperson, data]) => (
                <div key={salesperson} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <p className="text-sm font-medium text-muted-foreground mb-1">{salesperson}</p>
                  <p className="text-2xl font-bold text-primary mb-2">R{data.netSales.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{data.count} transaction{data.count !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Landmark className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No sales completed today</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
          <CardDescription>A complete log of all closed till sessions and their cash-up results.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Opening Float</TableHead>
                  <TableHead className="text-right">Expected Cash</TableHead>
                  <TableHead className="text-right">Counted Cash</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : sessions && sessions.length > 0 ? (
                  sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        {session.endDate ? format(new Date(session.endDate), 'PP') : '-'}
                      </TableCell>
                      <TableCell>{session.userName}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(session.openingBalance)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(session.expectedCash)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(session.countedCash)}</TableCell>
                      <TableCell className="text-right">
                        <DifferenceBadge difference={session.difference} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No closed sessions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
