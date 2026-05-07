'use client';

import { useState, useEffect, useCallback } from 'react';
import { toMoney } from '@/lib/format-utils';
import {
  Download,
  Loader2,
  ShoppingCart,
  DollarSign,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import PageHeader from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  date: string;
  total: number;
  customerName: string;
  salesperson: string;
  transactionType: 'sale' | 'withdrawal' | 'void' | 'return' | 'voucher';
  status: string;
  paymentMethod?: string;
  withdrawalReason?: string;
  userId: string;
  tillSessionId?: string;
  userName: string;
  itemCount: number;
}

export default function TransactionHistoryPage() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [transactionType, setTransactionType] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchTransactions = useCallback(async (
    type?: string,
    start?: string,
    end?: string
  ) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();

      if (type) params.append('transactionType', type);
      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);

      const response = await fetch(`/api/transaction-history?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      setTransactions(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load transactions',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleFilter = () => {
    fetchTransactions(transactionType, startDate, endDate);
  };

  const handleReset = () => {
    setTransactionType('');
    setStartDate('');
    setEndDate('');
    fetchTransactions();
  };

  const handleExport = () => {
    const csv = [
      ['Date', 'Type', 'Salesperson', 'Amount', 'Status', 'Payment Method'],
      ...transactions.map((t) => [
        new Date(t.date).toLocaleString(),
        t.transactionType,
        t.salesperson,
        `R${toMoney(t.total)}`,
        t.status,
        t.paymentMethod || '-',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <ShoppingCart className="h-4 w-4" />;
      case 'withdrawal':
        return <DollarSign className="h-4 w-4" />;
      case 'void':
        return <Trash2 className="h-4 w-4" />;
      case 'return':
        return <RotateCcw className="h-4 w-4" />;
      case 'voucher':
        return <ShoppingCart className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTransactionBadge = (type: string, status: string) => {
    if (type === 'sale') {
      return <Badge className="bg-blue-500">Sale</Badge>;
    } else if (type === 'withdrawal') {
      return <Badge className="bg-purple-500">Withdrawal</Badge>;
    } else if (type === 'void') {
      return <Badge variant="destructive">Void</Badge>;
    } else if (type === 'return') {
      return <Badge className="bg-orange-500">Return</Badge>;
    } else if (type === 'voucher') {
      return <Badge className="bg-amber-500 text-black">Voucher</Badge>;
    }
    return <Badge>{type}</Badge>;
  };

  const totalAmount = transactions.reduce((sum, t) => sum + Number(t.total), 0);
  const salesCount = transactions.filter((t) => t.transactionType === 'sale')
    .length;
  const withdrawalCount = transactions.filter(
    (t) => t.transactionType === 'withdrawal'
  ).length;
  const voidCount = transactions.filter((t) => t.transactionType === 'void')
    .length;
  const returnCount = transactions.filter((t) => t.transactionType === 'return')
    .length;
  const voucherCount = transactions.filter((t) => t.transactionType === 'voucher').length;

  if (isLoading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Transaction History" />

      <div className="grid grid-cols-1 gap-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transactions.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{salesCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Withdrawals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {withdrawalCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vouchers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {voucherCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Voids & Returns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {voidCount + returnCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R{toMoney(totalAmount)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Transaction Type</Label>
                <Select value={transactionType || 'all'} onValueChange={(value) => setTransactionType(value === 'all' ? '' : value)}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="sale">Sales</SelectItem>
                    <SelectItem value="withdrawal">Withdrawals</SelectItem>
                    <SelectItem value="void">Voids</SelectItem>
                    <SelectItem value="return">Returns</SelectItem>
                    <SelectItem value="voucher">Vouchers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

        {/* Transactions Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>
                Detailed transaction history with all details
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Salesperson</TableHead>
                    <TableHead>Customer / Reason</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-sm">
                          {new Date(transaction.date).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction.transactionType)}
                            {getTransactionBadge(
                              transaction.transactionType,
                              transaction.status
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {transaction.salesperson}
                        </TableCell>
                        <TableCell className="text-sm">
                          {transaction.transactionType === 'withdrawal'
                            ? transaction.withdrawalReason || '-'
                            : transaction.customerName || '-'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          R{toMoney(transaction.total)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {transaction.paymentMethod || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              transaction.status === 'Completed'
                                ? 'default'
                                : 'destructive'
                            }
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
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
