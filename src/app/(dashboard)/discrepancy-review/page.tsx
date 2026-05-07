'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Edit,
  Loader2,
  X,
  TrendingDown,
  Search,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import type { UserProfile } from '@/lib/types';

interface TillDiscrepancy {
  id: string;
  userName: string;
  openedAt: string;
  closedAt: string | null;
  openingBalance: number;
  closingBalance: number;
  expectedBalance: number;
  difference: number;
  varianceReason?: string;
  reconciliationNotes?: string;
  reconciliationApprovedBy?: string;
  totalSales: number;
  totalWithdrawals: number;
  totalVoids: number;
  totalReturns: number;
}

export default function DiscrepancyReviewPage() {
  const { toast } = useToast();
  const [adminUser, setAdminUser] = useState<UserProfile | null>(null);
  const [discrepancies, setDiscrepancies] = useState<TillDiscrepancy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<TillDiscrepancy | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolutionStatus, setResolutionStatus] = useState<'investigate' | 'approve' | 'reject'>('investigate');
  const [varianceReason, setVarianceReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'difference' | 'date'>('difference');

  const fetchDiscrepancies = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/till-reconciliation');
      if (!response.ok) throw new Error('Failed to fetch till sessions');
      const data = await response.json();
      const discrepanciesList = data
        .filter((session: any) => session.reconciliationStatus === 'discrepancy')
        .map((session: any) => ({
          ...session,
          openedAt: session.openedAt || '',
          closedAt: session.closedAt || null,
          openingBalance: Number(session.openingBalance) || 0,
          closingBalance: session.closingBalance != null ? Number(session.closingBalance) : 0,
          expectedBalance: Number(session.expectedBalance) || 0,
          difference:
            Number(session.difference ?? session.calculatedDifference ?? 0) || 0,
          totalSales: Number(session.totalSales) || 0,
          totalWithdrawals: Number(session.totalWithdrawals) || 0,
          totalVoids: Number(session.totalVoids) || 0,
          totalReturns: Number(session.totalReturns) || 0,
        }));
      setDiscrepancies(discrepanciesList);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load till reconciliation data',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const user = sessionStorage.getItem('currentUser');
    if (user) {
      setAdminUser(JSON.parse(user));
    }
    fetchDiscrepancies();
  }, [fetchDiscrepancies]);
  const handleViewDetails = async (discrepancy: TillDiscrepancy) => {
    try {
      const response = await fetch(`/api/till-reconciliation/${discrepancy.id}`);
      if (!response.ok) throw new Error('Failed to fetch details');
      const details = await response.json();
      // Ensure all balance fields are numbers
      const transformedDetails = {
        ...details,
        openingBalance: Number(details.openingBalance) || 0,
        closingBalance: Number(details.closingBalance) || 0,
        expectedBalance: Number(details.expectedBalance) || 0,
        difference: Number(details.difference) || 0,
        totalSales: Number(details.totalSales) || 0,
        totalWithdrawals: Number(details.totalWithdrawals) || 0,
        totalVoids: Number(details.totalVoids) || 0,
        totalReturns: Number(details.totalReturns) || 0,
      };
      setSelectedDiscrepancy(transformedDetails);
      setVarianceReason(details.varianceReason || '');
      setShowDetailDialog(true);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch discrepancy details',
      });
    }
  };

  const handleResolveDiscrepancy = async () => {
    if (!selectedDiscrepancy || !adminUser) return;

    try {
      setIsResolving(true);

      if (resolutionStatus === 'investigate') {
        // Update variance reason only
        const response = await fetch(`/api/till-reconciliation/${selectedDiscrepancy.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reconciliationStatus: 'discrepancy',
            varianceReason: varianceReason,
            reconciliationNotes: resolutionNotes,
            reconciliationApprovedBy: `${adminUser.firstName} ${adminUser.lastName}`,
          }),
        });

        if (!response.ok) throw new Error('Failed to update discrepancy');

        toast({
          title: 'Investigation Noted',
          description: 'Discrepancy details updated. Marked for further investigation.',
        });
      } else if (resolutionStatus === 'approve') {
        // Approve with discrepancy explanation
        const response = await fetch(`/api/till-reconciliation/${selectedDiscrepancy.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reconciliationStatus: 'verified',
            varianceReason: varianceReason,
            reconciliationNotes: resolutionNotes,
            reconciliationApprovedBy: `${adminUser.firstName} ${adminUser.lastName}`,
          }),
        });

        if (!response.ok) throw new Error('Failed to approve discrepancy');

        toast({
          title: 'Discrepancy Approved',
          description: `Till approved with variance reason: ${varianceReason}`,
        });
      } else {
        // Reject - mark as requiring escalation
        const response = await fetch(`/api/till-reconciliation/${selectedDiscrepancy.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reconciliationStatus: 'discrepancy',
            varianceReason: 'ESCALATED: ' + varianceReason,
            reconciliationNotes: 'REJECTED FOR APPROVAL - ' + resolutionNotes,
            reconciliationApprovedBy: `${adminUser.firstName} ${adminUser.lastName}`,
          }),
        });

        if (!response.ok) throw new Error('Failed to reject discrepancy');

        toast({
          variant: 'destructive',
          title: 'Discrepancy Escalated',
          description: 'This discrepancy requires further investigation before approval.',
        });
      }

      setShowResolveDialog(false);
      setShowDetailDialog(false);
      setSelectedDiscrepancy(null);
      setVarianceReason('');
      setResolutionNotes('');
      setResolutionStatus('investigate');
      fetchDiscrepancies();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to resolve discrepancy',
      });
    } finally {
      setIsResolving(false);
    }
  };

  const filteredDiscrepancies = discrepancies
    .filter(
      (d) =>
        d.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.id.includes(searchTerm)
    )
    .sort((a, b) => {
      if (sortBy === 'difference') {
        return Math.abs(b.difference) - Math.abs(a.difference);
      } else {
        const aDate = a.closedAt ? new Date(a.closedAt) : a.openedAt ? new Date(a.openedAt) : new Date(0);
        const bDate = b.closedAt ? new Date(b.closedAt) : b.openedAt ? new Date(b.openedAt) : new Date(0);
        return bDate.getTime() - aDate.getTime();
      }
    });

  const totalDiscrepanciesValue = Math.abs(
    filteredDiscrepancies.reduce((sum, d) => sum + d.difference, 0)
  );
  const largestDiscrepancy = filteredDiscrepancies.length > 0
    ? Math.abs(Math.max(...filteredDiscrepancies.map((d) => d.difference)))
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Balance Discrepancy Review" />

      <div className="grid grid-cols-1 gap-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Discrepancies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {filteredDiscrepancies.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tills requiring review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Variance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                R{totalDiscrepanciesValue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sum of all discrepancies
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Largest Variance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R{largestDiscrepancy.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Single till variance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Variance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R
                {(
                  filteredDiscrepancies.length > 0
                    ? totalDiscrepanciesValue / filteredDiscrepancies.length
                    : 0
                ).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Per till variance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alert for unresolved discrepancies */}
        {filteredDiscrepancies.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Discrepancies Require Review</AlertTitle>
            <AlertDescription>
              There are {filteredDiscrepancies.length} tills with balance discrepancies
              that require investigation and approval.
            </AlertDescription>
          </Alert>
        )}

        {/* Search and Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Filter & Sort</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search by Salesperson or Till ID</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort">Sort By</Label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger id="sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="difference">Largest Variance</SelectItem>
                    <SelectItem value="date">Recent First</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex items-end">
                <Button
                  onClick={fetchDiscrepancies}
                  className="w-full"
                >
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Discrepancies Table */}
        <Card>
          <CardHeader>
            <CardTitle>Discrepancies Requiring Review</CardTitle>
            <CardDescription>
              Review and resolve balance discrepancies for each till
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salesperson</TableHead>
                    <TableHead>Till Date</TableHead>
                    <TableHead className="text-right">Opening Balance</TableHead>
                    <TableHead className="text-right">Expected Balance</TableHead>
                    <TableHead className="text-right">Actual Balance</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead>Variance %</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDiscrepancies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle className="h-8 w-8 text-green-600" />
                          <p className="text-lg font-semibold">No Discrepancies</p>
                          <p className="text-sm text-muted-foreground">
                            All tills have been reconciled successfully
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDiscrepancies.map((discrepancy) => {
                      const variancePercent =
                        ((Math.abs(discrepancy.difference) / discrepancy.expectedBalance) *
                          100) || 0;
                      return (
                        <TableRow key={discrepancy.id} className="bg-red-50">
                          <TableCell className="font-medium">
                            {discrepancy.userName}
                          </TableCell>
                          <TableCell>
                            {new Date(discrepancy.closedAt || discrepancy.openedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            R{discrepancy.openingBalance.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            R{discrepancy.expectedBalance.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            R{(discrepancy.closingBalance || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-red-600 font-bold">
                              {discrepancy.difference < 0 ? '-' : '+'}R
                              {Math.abs(discrepancy.difference).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={variancePercent > 5 ? 'destructive' : 'secondary'}
                            >
                              {variancePercent.toFixed(2)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(discrepancy)}
                              className="gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Review
                            </Button>
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

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Discrepancy Review & Resolution</DialogTitle>
            <DialogDescription>
              {selectedDiscrepancy?.userName} - {selectedDiscrepancy ? new Date(selectedDiscrepancy.closedAt || selectedDiscrepancy.openedAt).toLocaleDateString() : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedDiscrepancy && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <TrendingDown className="h-4 w-4" />
                <AlertTitle>Balance Discrepancy</AlertTitle>
                <AlertDescription>
                  Variance of R{Math.abs(selectedDiscrepancy.difference).toFixed(2)} detected
                  (
                  {selectedDiscrepancy.difference < 0 ? 'Under' : 'Over'} by{' '}
                  {(
                    ((Math.abs(selectedDiscrepancy.difference) /
                      selectedDiscrepancy.expectedBalance) *
                      100) || 0
                  ).toFixed(2)}
                  %)
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4 bg-muted p-4 rounded">
                <div>
                  <p className="text-sm text-muted-foreground">Opening Balance</p>
                  <p className="text-lg font-bold">
                    R{selectedDiscrepancy.openingBalance.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expected Balance</p>
                  <p className="text-lg font-bold text-blue-600">
                    R{selectedDiscrepancy.expectedBalance.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Actual Balance</p>
                  <p className="text-lg font-bold">
                    R{(selectedDiscrepancy.closingBalance || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Variance</p>
                  <p className="text-lg font-bold text-red-600">
                    {selectedDiscrepancy.difference < 0 ? '-' : '+'}R
                    {Math.abs(selectedDiscrepancy.difference).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Total Sales</p>
                  <p>R{(selectedDiscrepancy.totalSales || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-medium">Withdrawals</p>
                  <p>R{(selectedDiscrepancy.totalWithdrawals || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-medium">Voids</p>
                  <p>R{(selectedDiscrepancy.totalVoids || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-medium">Returns</p>
                  <p>R{(selectedDiscrepancy.totalReturns || 0).toFixed(2)}</p>
                </div>
              </div>

              {!showResolveDialog && (
                <>
                  {selectedDiscrepancy.varianceReason && (
                    <div>
                      <Label>Variance Reason</Label>
                      <p className="text-sm bg-muted p-2 rounded">
                        {selectedDiscrepancy.varianceReason}
                      </p>
                    </div>
                  )}

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowDetailDialog(false)}
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => setShowResolveDialog(true)}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Resolve Discrepancy
                    </Button>
                  </DialogFooter>
                </>
              )}

              {showResolveDialog && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <Label htmlFor="resolution-status">Resolution Action</Label>
                    <Select value={resolutionStatus} onValueChange={(value: any) => setResolutionStatus(value)}>
                      <SelectTrigger id="resolution-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="investigate">
                          Mark for Investigation
                        </SelectItem>
                        <SelectItem value="approve">
                          Approve with Variance Explanation
                        </SelectItem>
                        <SelectItem value="reject">
                          Escalate - Requires Further Review
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="variance-reason">Variance Reason</Label>
                    <Textarea
                      id="variance-reason"
                      placeholder="Explain the cause of the variance (e.g., cash counting error, transaction recording issue, etc.)"
                      value={varianceReason}
                      onChange={(e) => setVarianceReason(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="resolution-notes">Resolution Notes</Label>
                    <Textarea
                      id="resolution-notes"
                      placeholder="Add additional notes about this resolution..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowResolveDialog(false);
                        setVarianceReason('');
                        setResolutionNotes('');
                      }}
                      disabled={isResolving}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleResolveDiscrepancy}
                      disabled={isResolving || !varianceReason.trim()}
                      className="gap-2"
                    >
                      {isResolving && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {resolutionStatus === 'approve'
                        ? 'Approve Discrepancy'
                        : resolutionStatus === 'reject'
                        ? 'Escalate'
                        : 'Mark for Investigation'}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
