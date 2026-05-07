'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { toMoney } from '@/lib/format-utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface DailyReport {
  reportDate: string;
  saleCount: number;
  withdrawalCount: number;
  voidCount: number;
  returnCount: number;
  totalSales: number;
  totalWithdrawals: number;
  totalVoids: number;
  totalReturns: number;
  cashSales: number;
  cardSales: number;
  uniqueSalespersons: number;
}

export default function DailyReportsPage() {
  const { toast } = useToast();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReports = useCallback(async (start?: string, end?: string) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();

      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);

      const response = await fetch(`/api/daily-reports?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch reports');
      const data = await response.json();
      setReports(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load daily reports',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleFilter = () => {
    if (startDate || endDate) {
      fetchReports(startDate, endDate);
    }
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    fetchReports();
  };

  // Calculate totals
  const totals = {
    sales: reports.reduce((sum, r) => sum + Number(r.totalSales), 0),
    withdrawals: reports.reduce((sum, r) => sum + Number(r.totalWithdrawals), 0),
    voids: reports.reduce((sum, r) => sum + Number(r.totalVoids), 0),
    returns: reports.reduce((sum, r) => sum + Number(r.totalReturns), 0),
    cashSales: reports.reduce((sum, r) => sum + Number(r.cashSales), 0),
    cardSales: reports.reduce((sum, r) => sum + Number(r.cardSales), 0),
    transactionCount: reports.reduce(
      (sum, r) =>
        sum +
        r.saleCount +
        r.withdrawalCount +
        r.voidCount +
        r.returnCount,
      0
    ),
  };

  const netSales = totals.sales - totals.voids + totals.returns;

  if (isLoading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Daily Reports" />

      <div className="grid grid-cols-1 gap-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                R{toMoney(totals.sales)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {reports.reduce((sum, r) => sum + r.saleCount, 0)} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R{toMoney(netSales)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                After voids & returns
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Withdrawals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                R{toMoney(totals.withdrawals)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {reports.reduce((sum, r) => sum + r.withdrawalCount, 0)}{' '}
                withdrawals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Adjustments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R{toMoney(totals.voids + totals.returns)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {reports.reduce((sum, r) => sum + r.voidCount + r.returnCount, 0)}{' '}
                items
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Method Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cash Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R{toMoney(totals.cashSales)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {((totals.cashSales / totals.sales) * 100 || 0).toFixed(1)}% of
                total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Card Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R{toMoney(totals.cardSales)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {((totals.cardSales / totals.sales) * 100 || 0).toFixed(1)}% of
                total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.transactionCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start">Start Date</Label>
                <Input
                  id="start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end">End Date</Label>
                <Input
                  id="end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="flex gap-2 items-end">
                <Button onClick={handleFilter} className="flex-1">
                  Filter
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1"
                >
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Summary</CardTitle>
            <CardDescription>
              Daily breakdown of sales, withdrawals, and adjustments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Sales Count</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Cash</TableHead>
                    <TableHead className="text-right">Card</TableHead>
                    <TableHead className="text-right">Withdrawals</TableHead>
                    <TableHead className="text-right">Voids</TableHead>
                    <TableHead className="text-right">Returns</TableHead>
                    <TableHead className="text-right">Net Sales</TableHead>
                    <TableHead className="text-center">Salespersons</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        No reports found
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map((report) => {
                      const netDaily =
                        Number(report.totalSales) -
                        Number(report.totalVoids) +
                        Number(report.totalReturns);
                      return (
                        <TableRow key={report.reportDate}>
                          <TableCell className="font-medium">
                            {new Date(report.reportDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {report.saleCount}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-blue-600">
                            R{toMoney(report.totalSales)}
                          </TableCell>
                          <TableCell className="text-right">
                            R{toMoney(report.cashSales)}
                          </TableCell>
                          <TableCell className="text-right">
                            R{toMoney(report.cardSales)}
                          </TableCell>
                          <TableCell className="text-right text-purple-600">
                            R{toMoney(report.totalWithdrawals)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            R{toMoney(report.totalVoids)}
                          </TableCell>
                          <TableCell className="text-right text-orange-600">
                            R{toMoney(report.totalReturns)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            R{toMoney(netDaily)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge>{report.uniqueSalespersons}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
