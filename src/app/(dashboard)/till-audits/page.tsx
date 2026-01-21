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
      where('date', '<=', endOfTodayDate.toISOString())
    );
  }, [firestore]);

  const { data: allTodaySales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);
  
  // Filter for completed and withdrawal transactions
  const todaySales = useMemo(() => {
    if (!allTodaySales) return [];
    return allTodaySales.filter(sale => sale.status === 'Completed' || sale.status === 'Withdrawal' || sale.transactionType === 'withdrawal');
  }, [allTodaySales]);
  
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
    const summary: Record<string, { netSales: number; count: number; cashSales: number; cardSales: number; withdrawals: number }> = {};
    
    todaySales.forEach(sale => {
      if (!summary[sale.salesperson]) {
        summary[sale.salesperson] = { netSales: 0, count: 0, cashSales: 0, cardSales: 0, withdrawals: 0 };
      }
      summary[sale.salesperson].netSales += sale.total;
      summary[sale.salesperson].count += 1;
      
      // Track cash, card, and withdrawals separately
      if (sale.status === 'Withdrawal' || sale.transactionType === 'withdrawal') {
        summary[sale.salesperson].withdrawals += Math.abs(sale.total); // withdrawals are negative, so abs them for tracking
      } else if (sale.paymentMethod === 'Card') {
        summary[sale.salesperson].cardSales += sale.total;
      } else {
        summary[sale.salesperson].cashSales += sale.total;
      }
    });
    
    return summary;
  }, [todaySales]);
  
  const getExpectedCashWithTodaySales = (session: TillSession): number => {
    // Calculate expected cash as: opening balance + cash sales today
    // Card and withdrawals are automatic (not counted in cash)
    const salespersonData = salesBySalesperson[session.userName];
    const todayCashSales = salespersonData?.cashSales || 0;
    return (session.openingBalance || 0) + todayCashSales;
  };

  const getDifferenceVariant = (difference: number = 0) => {
    if (difference < 0) return 'destructive';
    if (difference > 0) return 'default';
    return 'secondary';
  }
  
  const DifferenceBadge = ({ difference = 0, expectedCash = 0, countedCash = 0 }: { difference: number | undefined; expectedCash?: number; countedCash?: number }) => {
    if (difference === undefined) return null;
    
    const absoDifference = Math.abs(difference || 0);
    const variant = getDifferenceVariant(difference);
    const Icon = difference < 0 ? TrendingDown : difference > 0 ? TrendingUp : Minus;
    
    let message = '';
    if (difference > 0) {
      message = `Over by ${formatCurrency(difference)}`;
    } else if (difference < 0) {
      message = `Short by ${formatCurrency(absoDifference)}`;
    } else {
      message = 'Balanced ✓';
    }

    return (
        <Badge variant={variant} className="flex items-center gap-2 px-3 py-1.5">
            <Icon className="h-4 w-4" />
            <span className="font-medium text-sm">{message}</span>
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
            Net Sales for Today - {format(new Date(), 'MMMM d, yyyy')}
          </CardTitle>
          <CardDescription>Daily sales summary by salesperson</CardDescription>
        </CardHeader>
        <CardContent>
          {salesLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : Object.keys(salesBySalesperson).length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-0 divide-y sm:divide-y-0 sm:divide-x">
                  {Object.entries(salesBySalesperson)
                    .sort(([, a], [, b]) => b.netSales - a.netSales)
                    .map(([salesperson, data]) => (
                      <div 
                        key={salesperson} 
                        className="p-4 bg-background hover:bg-muted/50 transition-colors flex flex-col justify-between border-b sm:border-b-0 sm:border-r last:border-b-0 last:sm:border-r-0"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground truncate mb-2">{salesperson}</p>
                          <p className="text-3xl font-bold text-primary mb-1">R{data.netSales.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            {data.count} {data.count === 1 ? 'sale' : 'sales'}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">
                            Avg: R{(data.netSales / data.count).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Landmark className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No sales completed today</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            Session History - All Till Sessions
          </CardTitle>
          <CardDescription>A complete log of all closed till sessions and their cash-up results.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted sticky top-0">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Opening Float</TableHead>
                    <TableHead className="text-right">Cash Sales</TableHead>
                    <TableHead className="text-right">Card Sales</TableHead>
                    <TableHead className="text-right">Withdrawals</TableHead>
                    <TableHead className="text-right">Expected Cash</TableHead>
                    <TableHead className="text-right">Counted Cash</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : sessions && sessions.length > 0 ? (
                    sessions.map((session, idx) => {
                      const salespersonData = salesBySalesperson[session.userName];
                      const cashSales = salespersonData?.cashSales || 0;
                      const cardSales = salespersonData?.cardSales || 0;
                      const withdrawals = salespersonData?.withdrawals || 0;
                      const calculatedExpectedCash = getExpectedCashWithTodaySales(session);
                      const calculatedDifference = (session.countedCash || 0) - calculatedExpectedCash;
                      return (
                        <TableRow key={session.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                          <TableCell className="font-medium">
                            <div>
                              <p>{session.endDate ? format(new Date(session.endDate), 'PP') : '-'}</p>
                              <p className="text-xs text-muted-foreground">{session.endDate ? format(new Date(session.endDate), 'p') : ''}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{session.userName}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatCurrency(session.openingBalance)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatCurrency(cashSales)}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-blue-600">{formatCurrency(cardSales)}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-amber-600">{formatCurrency(withdrawals)}</TableCell>
                          <TableCell>
                            <div className="text-right">
                              <p className="font-mono text-sm">{formatCurrency(calculatedExpectedCash)}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(session.openingBalance)} + {formatCurrency(cashSales)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatCurrency(session.countedCash)}</TableCell>
                          <TableCell className="text-right">
                            <DifferenceBadge difference={calculatedDifference} expectedCash={calculatedExpectedCash} countedCash={session.countedCash} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        No closed sessions found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
