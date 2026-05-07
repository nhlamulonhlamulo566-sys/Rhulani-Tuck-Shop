'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Clock, Loader2, Eye, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import type { TillSession, UserProfile } from '@/lib/types';

interface TillSummary extends TillSession {
  openedAt?: string;
  closedAt?: string | null;
  totalSales: number;
  totalWithdrawals: number;
  totalVoids: number;
  totalReturns: number;
  expectedBalance: number;
  actualBalance: number;
  difference: number;
  reconciliationStatus: 'pending' | 'verified' | 'discrepancy';
  reconciliationNotes?: string;
  reconciliationApprovedBy?: string;
  reconciliationApprovedAt?: string;
}

export default function TillReconciliationPage() {
  const { toast } = useToast();
  const [adminUser, setAdminUser] = useState<UserProfile | null>(null);
  const [tillSessions, setTillSessions] = useState<TillSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<TillSummary | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'verified' | 'discrepancy'>('verified');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  const fetchTillSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/till-reconciliation');
      if (!response.ok) throw new Error('Failed to fetch till sessions');
      const data = await response.json();
      const normalizedSessions = data.map((session: any) => ({
        ...session,
        startDate: session.startDate || session.openedAt,
        endDate: session.endDate || session.closedAt,
        openedAt: session.openedAt || session.startDate,
        closedAt: session.closedAt || session.endDate,
        openingBalance: Number(session.openingBalance) || 0,
        closingBalance: session.closingBalance != null ? Number(session.closingBalance) : null,
        totalSales: Number(session.totalSales) || 0,
        totalWithdrawals: Number(session.totalWithdrawals) || 0,
        totalVoids: Number(session.totalVoids) || 0,
        totalReturns: Number(session.totalReturns) || 0,
        expectedBalance:
          Number(session.expectedBalance) ||
          Number(session.openingBalance || 0) +
            Number(session.totalSales || 0) -
            Number(session.totalWithdrawals || 0) -
            Number(session.totalVoids || 0) -
            Number(session.totalReturns || 0),
        actualBalance: Number(session.actualBalance) || Number(session.closingBalance) || 0,
        difference: Number(session.difference) || 0,
      }));
      setTillSessions(normalizedSessions);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load till sessions',
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
    fetchTillSessions();
  }, [fetchTillSessions]);
  const formatSafeDate = (value?: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleString();
  };

  const handleViewDetails = async (session: TillSummary) => {
    try {
      const response = await fetch(`/api/till-reconciliation/${session.id}`);
      if (!response.ok) throw new Error('Failed to fetch details');
      const detailedSession = await response.json();
      setSelectedSession({
        ...detailedSession,
        startDate: detailedSession.startDate || detailedSession.openedAt,
        endDate: detailedSession.endDate || detailedSession.closedAt,
        openedAt: detailedSession.openedAt || detailedSession.startDate,
        closedAt: detailedSession.closedAt || detailedSession.endDate,
        openingBalance: Number(detailedSession.openingBalance) || 0,
        closingBalance: detailedSession.closingBalance != null ? Number(detailedSession.closingBalance) : null,
        totalSales: Number(detailedSession.totalSales) || 0,
        totalWithdrawals: Number(detailedSession.totalWithdrawals) || 0,
        totalVoids: Number(detailedSession.totalVoids) || 0,
        totalReturns: Number(detailedSession.totalReturns) || 0,
        expectedBalance:
          Number(detailedSession.expectedBalance) ||
          Number(detailedSession.openingBalance || 0) +
            Number(detailedSession.totalSales || 0) -
            Number(detailedSession.totalWithdrawals || 0) -
            Number(detailedSession.totalVoids || 0) -
            Number(detailedSession.totalReturns || 0),
        actualBalance: Number(detailedSession.actualBalance) || Number(detailedSession.closingBalance) || 0,
        difference: Number(detailedSession.difference) || 0,
      });
      setShowDetailDialog(true);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch till details',
      });
    }
  };

  const handleApproveReconciliation = async () => {
    if (!selectedSession || !adminUser) return;

    try {
      setIsApproving(true);
      const response = await fetch(`/api/till-reconciliation/${selectedSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reconciliationStatus: approvalStatus,
          reconciliationNotes: approvalNotes,
          reconciliationApprovedBy: `${adminUser.firstName} ${adminUser.lastName}`,
        }),
      });

      if (!response.ok) throw new Error('Failed to approve reconciliation');

      toast({
        title: 'Reconciliation Approved',
        description: `Till ${selectedSession.userName} marked as ${approvalStatus}`,
      });

      setShowApprovalDialog(false);
      setApprovalNotes('');
      setApprovalStatus('verified');
      setShowDetailDialog(false);
      setSelectedSession(null);
      fetchTillSessions();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve reconciliation',
      });
    } finally {
      setIsApproving(false);
    }
  };

  const getReconciliationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500">Verified</Badge>;
      case 'discrepancy':
        return <Badge variant="destructive">Discrepancy</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
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
      <PageHeader title="Till Reconciliation" />
      
      <div className="grid grid-cols-1 gap-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Tills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tillSessions.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Verified
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {tillSessions.filter(s => s.reconciliationStatus === 'verified').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Discrepancies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {tillSessions.filter(s => s.reconciliationStatus === 'discrepancy').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {tillSessions.filter(s => s.reconciliationStatus === 'pending').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Till Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Till Sessions</CardTitle>
            <CardDescription>
              Review and reconcile till sessions for balance verification
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[65vh] overflow-y-auto min-h-[20rem]">
              <div className="min-w-[900px]">
                <Table>
                  <TableHeader>
                  <TableRow>
                    <TableHead>Salesperson</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Closed</TableHead>
                    <TableHead>Opening Balance</TableHead>
                    <TableHead>Closing Balance</TableHead>
                    <TableHead>Expected Balance</TableHead>
                    <TableHead>Difference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tillSessions.map((session) => {
                    const openedAt = formatSafeDate(session.openedAt || session.startDate);
                    const closedAt = formatSafeDate(session.closedAt || session.endDate);
                    const expectedBalance = Number(session.expectedBalance ?? NaN);

                    return (
                      <TableRow
                        key={session.id}
                        className={
                          session.reconciliationStatus === 'discrepancy'
                            ? 'bg-red-50'
                            : session.reconciliationStatus === 'pending'
                            ? 'bg-orange-50'
                            : ''
                        }
                      >
                        <TableCell className="font-medium">{session.userName}</TableCell>
                        <TableCell>
                          {openedAt ?? 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {closedAt ?? 'Open'}
                        </TableCell>
                        <TableCell>R{Number(session.openingBalance).toFixed(2)}</TableCell>
                        <TableCell>
                          {session.closingBalance != null
                            ? `R${Number(session.closingBalance).toFixed(2)}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          R{!Number.isNaN(expectedBalance)
                            ? expectedBalance.toFixed(2)
                            : (
                                Number(session.openingBalance) +
                                Number(session.totalSales || 0) -
                                Number(session.totalWithdrawals || 0) -
                                Number(session.totalVoids || 0) -
                                Number(session.totalReturns || 0)
                              ).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              Math.abs(session.difference || 0) < 0.01
                                ? 'text-green-600 font-semibold'
                                : 'text-red-600 font-semibold'
                            }
                          >
                            R{(session.difference || 0).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getReconciliationBadge(session.reconciliationStatus)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(session)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Till Session Details</DialogTitle>
            <DialogDescription>
              {selectedSession?.userName} - {(selectedSession?.openedAt || selectedSession?.startDate)
                ? new Date(selectedSession.openedAt || selectedSession.startDate).toLocaleString()
                : 'Unknown'}
            </DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              {Math.abs(selectedSession.difference || 0) >= 0.01 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Balance Discrepancy Detected</AlertTitle>
                  <AlertDescription>
                    R{Math.abs(selectedSession.difference || 0).toFixed(2)} difference between expected and actual balance
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Opening Balance</label>
                  <p className="text-lg font-semibold">R{Number(selectedSession.openingBalance).toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Closing Balance</label>
                  <p className="text-lg font-semibold">
                    R{Number(selectedSession.closingBalance || 0).toFixed(2)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Total Sales</label>
                  <p>R{Number(selectedSession.totalSales || 0).toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Total Withdrawals</label>
                  <p>R{Number(selectedSession.totalWithdrawals || 0).toFixed(2)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Total Voids</label>
                  <p>R{Number(selectedSession.totalVoids || 0).toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Total Returns</label>
                  <p>R{Number(selectedSession.totalReturns || 0).toFixed(2)}</p>
                </div>

                <div className="col-span-2 border-t pt-4">
                  <label className="text-sm font-medium">Expected Balance</label>
                  <p className="text-lg font-semibold">
                    R{Number(selectedSession.expectedBalance || selectedSession.openingBalance || 0).toFixed(2)}
                  </p>
                </div>

                <div className="col-span-2">
                  <label className="text-sm font-medium">Difference</label>
                  <p
                    className={
                      'text-lg font-semibold ' +
                      (Math.abs(Number(selectedSession.difference) || 0) < 0.01
                        ? 'text-green-600'
                        : 'text-red-600')
                    }
                  >
                    R{Number(selectedSession.difference || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {selectedSession.reconciliationNotes && (
                <div>
                  <label className="text-sm font-medium">Reconciliation Notes</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedSession.reconciliationNotes}
                  </p>
                </div>
              )}

              {selectedSession.reconciliationStatus !== 'pending' && (
                <div className="bg-muted p-3 rounded">
                  <p className="text-sm">
                    <strong>Approved by:</strong> {selectedSession.reconciliationApprovedBy}
                  </p>
                  <p className="text-sm">
                    <strong>Approved at:</strong>{' '}
                    {new Date(
                      selectedSession.reconciliationApprovedAt || ''
                    ).toLocaleString()}
                  </p>
                </div>
              )}

              {selectedSession.reconciliationStatus === 'pending' && (
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowDetailDialog(false)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setShowApprovalDialog(true);
                    }}
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve Reconciliation
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Till Reconciliation</DialogTitle>
            <DialogDescription>
              Review and approve the till reconciliation for {selectedSession?.userName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {Math.abs(selectedSession?.difference || 0) >= 0.01 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Discrepancy Detected</AlertTitle>
                <AlertDescription>
                  R{Math.abs(selectedSession?.difference || 0).toFixed(2)} difference will be noted
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="status">Reconciliation Status</Label>
              <Select value={approvalStatus} onValueChange={(value: any) => setApprovalStatus(value)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="verified">Verified - Balance Matches</SelectItem>
                  <SelectItem value="discrepancy">Discrepancy - Variance Exists</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Approval Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about this reconciliation..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowApprovalDialog(false);
                  setApprovalNotes('');
                  setApprovalStatus('verified');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApproveReconciliation}
                disabled={isApproving}
                className="gap-2"
              >
                {isApproving && <Loader2 className="h-4 w-4 animate-spin" />}
                Approve
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
