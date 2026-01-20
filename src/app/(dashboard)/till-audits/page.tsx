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
import type { TillSession } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
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
  
  const sessions = useMemo(() => {
    if (!sessionsUnsorted) return null;
    return [...sessionsUnsorted].sort((a, b) => {
      const aDate = a.endDate ? new Date(a.endDate).getTime() : 0;
      const bDate = b.endDate ? new Date(b.endDate).getTime() : 0;
      return bDate - aDate;
    });
  }, [sessionsUnsorted]);
  
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
