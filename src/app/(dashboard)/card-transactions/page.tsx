'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/page-header';
import { useFirestore, useCollection, useUser } from '@/firebase';
import type { Sale } from '@/lib/types';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CreditCard, Download, Eye, Loader2, TrendingUp, AlertTriangle } from 'lucide-react';

interface CardTransactionDetail extends Sale {
  salePerson?: string;
}

export default function CardTransactionsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [selectedTransaction, setSelectedTransaction] = useState<CardTransactionDetail | null>(null);
  const [searchId, setSearchId] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month

  // Query all sales with card transactions
  const cardsQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'sales'),
      where('cardTransactionId', '!=', null),
      orderBy('cardTransactionId'),
      orderBy('date', 'desc')
    );
  }, [firestore, user]);

  const { data: cardTransactions = [], isLoading } = useCollection<Sale>(cardsQuery);

  // Filter and calculate statistics
  const stats = useMemo(() => {
    let filtered = (cardTransactions || []).filter(tx => tx.cardTransactionId);

    // Apply date filter
    const now = new Date();
    if (dateFilter === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(tx => new Date(tx.date) >= today);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(tx => new Date(tx.date) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      filtered = filtered.filter(tx => new Date(tx.date) >= monthAgo);
    }

    // Apply search filter
    if (searchId) {
      filtered = filtered.filter(tx =>
        tx.cardTransactionId?.toLowerCase().includes(searchId.toLowerCase()) ||
        tx.salesperson?.toLowerCase().includes(searchId.toLowerCase())
      );
    }

    const sales = filtered.filter(tx => tx.transactionType !== 'withdrawal' && tx.total > 0);
    const withdrawals = filtered.filter(tx => tx.transactionType === 'withdrawal' && tx.total < 0);

    const totalSalesAmount = sales.reduce((sum, tx) => sum + tx.total, 0);
    const totalWithdrawalsAmount = Math.abs(withdrawals.reduce((sum, tx) => sum + tx.total, 0));
    const netAmount = totalSalesAmount - totalWithdrawalsAmount;

    return {
      filtered,
      sales,
      withdrawals,
      totalSalesAmount,
      totalWithdrawalsAmount,
      netAmount,
      totalTransactions: filtered.length,
      totalSalesCount: sales.length,
      totalWithdrawalsCount: withdrawals.length,
    };
  }, [cardTransactions, searchId, dateFilter]);

  const formatCurrency = (amount: number) => {
    return `R${Math.abs(amount).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportTransactions = () => {
    const csv = [
      ['Transaction ID', 'Date', 'Type', 'Salesperson', 'Amount', 'Status'].join(','),
      ...stats.filtered.map(tx =>
        [
          tx.cardTransactionId || 'N/A',
          formatDate(tx.date),
          tx.transactionType === 'withdrawal' ? 'Withdrawal' : 'Sale',
          tx.salesperson,
          formatCurrency(tx.total),
          tx.status,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `card-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Card Transactions">
          <Button onClick={exportTransactions} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </PageHeader>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransactions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalSalesCount} sales, {stats.totalWithdrawalsCount} withdrawals
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-900">Sales Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{formatCurrency(stats.totalSalesAmount)}</div>
              <p className="text-xs text-green-600 mt-1">{stats.totalSalesCount} transactions</p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">Withdrawals Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{formatCurrency(stats.totalWithdrawalsAmount)}</div>
              <p className="text-xs text-blue-600 mt-1">{stats.totalWithdrawalsCount} transactions</p>
            </CardContent>
          </Card>

          <Card className={stats.netAmount >= 0 ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-200'}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.netAmount >= 0 ? 'text-purple-700' : 'text-red-700'}`}>
                {formatCurrency(stats.netAmount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Sales minus withdrawals</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium block mb-2">Search Transaction ID or Salesperson</label>
                <Input
                  placeholder="Enter transaction ID or name..."
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium block mb-2">Date Range</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.filtered.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No Transactions Found</AlertTitle>
                <AlertDescription>
                  No card transactions match the current filters. Try adjusting your search or date range.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Salesperson</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.filtered.map((transaction) => (
                      <TableRow key={transaction.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm">
                          {transaction.cardTransactionId || 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.transactionType === 'withdrawal' ? 'secondary' : 'default'}>
                            {transaction.transactionType === 'withdrawal' ? 'Withdrawal' : 'Sale'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{transaction.salesperson}</TableCell>
                        <TableCell className={`text-right font-medium ${
                          transaction.total > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(transaction.total)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={transaction.status === 'Completed' ? 'default' : 'secondary'}
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTransaction(transaction)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Card transaction {selectedTransaction?.cardTransactionId}
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="font-mono font-bold">{selectedTransaction.cardTransactionId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date & Time</p>
                  <p className="font-medium">{formatDate(selectedTransaction.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">
                    {selectedTransaction.transactionType === 'withdrawal' ? 'Withdrawal' : 'Sale'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge>{selectedTransaction.status}</Badge>
                </div>
              </div>

              <Separator />

              {/* Transaction Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Salesperson</p>
                  <p className="font-medium">{selectedTransaction.salesperson}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Card
                  </p>
                </div>
              </div>

              {selectedTransaction.withdrawalReason && (
                <div>
                  <p className="text-sm text-muted-foreground">Withdrawal Reason</p>
                  <p className="font-medium">{selectedTransaction.withdrawalReason}</p>
                </div>
              )}

              <Separator />

              {/* Amount Breakdown */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                {selectedTransaction.transactionType === 'withdrawal' ? (
                  <div className="flex justify-between items-center">
                    <span>Withdrawal Amount</span>
                    <span className="font-bold text-red-600">{formatCurrency(selectedTransaction.total)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span>Subtotal</span>
                      <span>{formatCurrency(selectedTransaction.subtotal || 0)}</span>
                    </div>
                    {selectedTransaction.tax ? (
                      <div className="flex justify-between items-center">
                        <span>Tax</span>
                        <span>{formatCurrency(selectedTransaction.tax)}</span>
                      </div>
                    ) : null}
                    <Separator className="my-2" />
                    <div className="flex justify-between items-center font-bold text-lg">
                      <span>Total</span>
                      <span className="text-green-600">{formatCurrency(selectedTransaction.total)}</span>
                    </div>
                  </>
                )}
              </div>

              {selectedTransaction.items && selectedTransaction.items.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-3">Items</p>
                    <div className="space-y-2">
                      {selectedTransaction.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm border-b pb-2 last:border-b-0">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
