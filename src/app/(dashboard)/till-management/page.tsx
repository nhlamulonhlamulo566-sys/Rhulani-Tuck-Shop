'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Landmark, CheckCircle, AlertTriangle, User, Ban, Undo2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Sale, TillSession, UserProfile } from '@/lib/types';
import { format, startOfToday, startOfWeek, startOfMonth, endOfToday, endOfWeek, endOfMonth, isWithinInterval } from 'date-fns';
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, limit } from 'firebase/firestore';
import PageHeader from '@/components/page-header';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// --- Till Management Components ---

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
);

const ActiveSessionCard = ({ session, sales, onEndSession }: { session: TillSession, sales: Sale[], onEndSession: (countedCash: number) => void }) => {
    const [countedCash, setCountedCash] = useState('');
    
    const cashSales = useMemo(() => {
        if (!sales || !session) return 0;
        return sales
            .filter(sale => sale.paymentMethod === 'Cash' && new Date(sale.date) >= new Date(session.startDate))
            .reduce((total, sale) => total + sale.total, 0);
    }, [sales, session]);

    const expectedCash = session.openingBalance + cashSales;
    const difference = countedCash ? parseFloat(countedCash) - expectedCash : 0;
    
    return (
        <Card className="border-primary">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Active Till for {session.userName}</span>
                </CardTitle>
                <CardDescription>
                    Session started on {format(new Date(session.startDate), 'PPP p')}.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StatCard title="Opening Balance" value={`R${session.openingBalance.toFixed(2)}`} icon={Landmark} />
                    <StatCard title="Cash Sales Today" value={`R${cashSales.toFixed(2)}`} icon={Landmark} />
                </div>
                <Separator />
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                        <span>Expected in Till</span>
                        <span>{`R${expectedCash.toFixed(2)}`}</span>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`countedCash-${session.id}`}>Enter Counted Cash</Label>
                        <Input
                            id={`countedCash-${session.id}`}
                            type="number"
                            placeholder="e.g., 1234.50"
                            value={countedCash}
                            onChange={(e) => setCountedCash(e.target.value)}
                        />
                    </div>
                    <div className={`flex justify-between items-center font-semibold ${difference === 0 ? '' : difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <span>Difference</span>
                        <span>{`R${difference.toFixed(2)}`}</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button className="w-full" onClick={() => onEndSession(parseFloat(countedCash))} disabled={!countedCash}>
                    End Day & Close Till for {session.userName}
                </Button>
            </CardFooter>
        </Card>
    );
}

const StartSessionCard = ({ users, onStartSession }: { users: UserProfile[]; onStartSession: (openingBalance: number, selectedUserId: string) => void; }) => {
    const [openingBalance, setOpeningBalance] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
    
    const handleStart = () => {
        if (selectedUserId) {
            onStartSession(parseFloat(openingBalance), selectedUserId);
            // Clear form after starting
            setOpeningBalance('');
            setSelectedUserId(undefined);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6 text-primary" />
                    <span>Start a New Session</span>
                </CardTitle>
                <CardDescription>Start a new till session for a salesperson.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="openingBalance">Enter Opening Float</Label>
                    <Input 
                        id="openingBalance"
                        type="number"
                        placeholder="e.g., 500.00"
                        value={openingBalance}
                        onChange={(e) => setOpeningBalance(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="user-select">Open Till For</Label>
                    <Select onValueChange={setSelectedUserId} value={selectedUserId}>
                        <SelectTrigger id="user-select">
                            <SelectValue placeholder="Select a salesperson..." />
                        </SelectTrigger>
                        <SelectContent>
                            {users.map(user => (
                                <SelectItem key={user.id} value={user.id}>
                                    {user.firstName} {user.lastName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={handleStart} disabled={!openingBalance || !selectedUserId}>Start New Day</Button>
            </CardFooter>
        </Card>
    );
};

// --- Cash-Up Components & Logic ---

interface PaymentStats {
  cash: number;
  card: number;
  voids: number;
  returns: number;
  total: number;
}

interface PeriodTotals {
  today: PaymentStats;
  thisWeek: PaymentStats;
  thisMonth: PaymentStats;
}

type SalespersonTotals = Record<string, PeriodTotals>;

const emptyStats: PaymentStats = { cash: 0, card: 0, voids: 0, returns: 0, total: 0 };
const emptyPeriodTotals: PeriodTotals = {
  today: { ...emptyStats },
  thisWeek: { ...emptyStats },
  thisMonth: { ...emptyStats },
};

const StatDisplay = ({ title, amount }: { title: string; amount: number }) => (
  <div className="flex justify-between items-center text-sm">
    <p className="text-muted-foreground">{title}</p>
    <p className="font-medium">R{amount.toFixed(2)}</p>
  </div>
);

const TotalsCard = ({ title, stats }: { title: string; stats: PaymentStats }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <StatDisplay title="Cash Payments" amount={stats.cash} />
        <StatDisplay title="Card Payments" amount={stats.card} />
      </div>
      <Separator />
      <div className="flex justify-between font-bold text-lg">
        <span>Net Sales</span>
        <span>R{stats.total.toFixed(2)}</span>
      </div>
    </CardContent>
  </Card>
);

const AdjustmentCard = ({ title, amount, icon: Icon }: { title: string; amount: number; icon: React.ElementType }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span>{title}</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">R{amount.toFixed(2)}</p>
      <p className="text-xs text-muted-foreground">Total value for this period</p>
    </CardContent>
  </Card>
);

const PeriodSection = ({ title, stats }: { title: string; stats: PaymentStats }) => (
    <div>
        <h3 className="mb-4 text-xl font-semibold tracking-tight">{title}</h3>
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          <TotalsCard title="Net Sales" stats={stats} />
          <AdjustmentCard title="Voids" amount={stats.voids} icon={Ban} />
          <AdjustmentCard title="Returns" amount={stats.returns} icon={Undo2} />
        </div>
    </div>
  );


export default function TillManagementPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    
    // --- Data Fetching ---
    const activeSessionsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
          collection(firestore, 'tillSessions'),
          where('status', '==', 'Active'),
        );
      }, [firestore, user]
    );
    const { data: activeSessions, isLoading: sessionLoading } = useCollection<TillSession>(activeSessionsQuery);

    const salesQuery = useMemoFirebase(() => {
        if (!user) return null;
        const startOfMonthDate = startOfMonth(new Date());
        return query(collection(firestore, 'sales'), where('date', '>=', startOfMonthDate.toISOString()));
    }, [firestore, user]);
    const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);
    
    const historyQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
          collection(firestore, 'tillSessions'), 
          where('status', '==', 'Closed')
        );
      }, [firestore, user]
    );
    const { data: historyUnsorted, isLoading: historyLoading, error: historyError } = useCollection<TillSession>(historyQuery);
    
    const history = useMemo(() => {
        if (!historyUnsorted) return null;
        const startOfMonthDate = startOfMonth(new Date());
        // Filter by current month and sort by endDate descending
        return [...historyUnsorted]
            .filter(session => session.endDate && new Date(session.endDate) >= startOfMonthDate)
            .sort((a, b) => {
                const aDate = a.endDate ? new Date(a.endDate).getTime() : 0;
                const bDate = b.endDate ? new Date(b.endDate).getTime() : 0;
                return bDate - aDate;
            });
    }, [historyUnsorted]);

    const usersQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'users'))
      },
      [firestore, user]
    );
    const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);

    // --- User & Session Filtering Logic ---
    const salesUsers = useMemo(() => users?.filter(u => u.role === 'Sales') || [], [users]);
    const usersWithActiveSession = useMemo(() => activeSessions?.map(s => s.userId) || [], [activeSessions]);
    const usersWithoutActiveSession = useMemo(() => {
        return salesUsers.filter(u => !usersWithActiveSession.includes(u.id));
    }, [salesUsers, usersWithActiveSession]);

    // --- Till Management Logic ---
    const handleStartSession = (openingBalance: number, selectedUserId: string) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            return;
        }
        if (isNaN(openingBalance) || openingBalance < 0) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter a valid opening balance.' });
            return;
        }

        const selectedUser = users?.find(u => u.id === selectedUserId);
        if (!selectedUser) {
            toast({ variant: 'destructive', title: 'Error', description: 'Selected user not found.' });
            return;
        }

        const newSession = {
            startDate: new Date().toISOString(),
            openingBalance,
            status: 'Active' as const,
            userId: selectedUser.id,
            userName: `${selectedUser.firstName} ${selectedUser.lastName}`
        };

        addDocumentNonBlocking(collection(firestore, 'tillSessions'), newSession);
        toast({ title: 'Success', description: `New till session started for ${selectedUser.firstName}.` });
    };

    const handleEndSession = (sessionId: string, countedCash: number) => {
        const sessionToEnd = activeSessions?.find(s => s.id === sessionId);
        if (!sessionToEnd || !sales) return;

         if (isNaN(countedCash) || countedCash < 0) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter the valid amount of cash counted.' });
            return;
        }
        
        const cashSales = sales
            .filter(sale => sale.paymentMethod === 'Cash' && new Date(sale.date) >= new Date(sessionToEnd.startDate))
            .reduce((total, sale) => total + sale.total, 0);
        
        const expectedCash = sessionToEnd.openingBalance + cashSales;
        const difference = countedCash - expectedCash;
        
        const sessionRef = doc(firestore, 'tillSessions', sessionToEnd.id);
        const updatedData = {
            endDate: new Date().toISOString(),
            status: 'Closed' as const,
            expectedCash,
            countedCash,
            difference,
        };
        
        updateDocumentNonBlocking(sessionRef, updatedData);
        toast({ title: 'Session Closed', description: `Till for ${sessionToEnd.userName} has been cashed up.` });
    };

    // --- Cash-Up Logic ---
    const salespersonTotals: SalespersonTotals = useMemo(() => {
      const initialData: SalespersonTotals = {};
      
      if (users) {
        users.forEach(user => {
          const name = `${user.firstName} ${user.lastName}`;
          initialData[name] = JSON.parse(JSON.stringify(emptyPeriodTotals));
        });
      }

      if (!sales) return initialData;

      const now = new Date();
      const todayInterval = { start: startOfToday(), end: endOfToday() };
      const weekInterval = { start: startOfWeek(now), end: endOfWeek(now) };
      const monthInterval = { start: startOfMonth(now), end: endOfMonth(now) };

      return sales.reduce((acc, sale) => {
        const salespersonName = sale.salesperson;
        // Only process sales if the salesperson exists in our current user list.
        if (acc[salespersonName]) {
            const saleDate = new Date(sale.date);
            
            const processSale = (period: keyof PeriodTotals, interval: { start: Date; end: Date }) => {
            if (isWithinInterval(saleDate, interval)) {
                
                if (sale.status === 'Voided') {
                acc[salespersonName][period].voids += sale.total;
                return;
                }

                if (sale.status === 'Completed' || sale.status === 'Partially Returned') {
                if (sale.paymentMethod === 'Cash') {
                    acc[salespersonName][period].cash += sale.total;
                } else if (sale.paymentMethod === 'Card') {
                    acc[salespersonName][period].card += sale.total;
                }
                acc[salespersonName][period].total += sale.total;
                }
                
                if (sale.status === 'Partially Returned' || sale.status === 'Returned') {
                const returnedValue = sale.items.reduce((sum, item) => {
                    const returnedQty = item.returnedQuantity || 0;
                    return sum + (returnedQty * item.price);
                }, 0);
                
                const taxRate = (sale.subtotal && sale.subtotal > 0) ? sale.tax / sale.subtotal : 0;
                const returnedTax = returnedValue * taxRate;
                
                const totalReturnedValue = returnedValue + (isNaN(returnedTax) ? 0 : returnedTax);
                
                acc[salespersonName][period].returns += totalReturnedValue;
                acc[salespersonName][period].total -= totalReturnedValue;
                }
            }
            };

            processSale('today', todayInterval);
            processSale('thisWeek', weekInterval);
            processSale('thisMonth', monthInterval);
        }
        
        return acc;
      }, initialData);

    }, [sales, users]);
    
    const grandTotals: PeriodTotals = useMemo(() => {
      const totals = JSON.parse(JSON.stringify(emptyPeriodTotals));
      Object.values(salespersonTotals).forEach(personTotals => {
          Object.keys(totals).forEach(period => {
              const p = period as keyof PeriodTotals;
              totals[p].cash += personTotals[p].cash;
              totals[p].card += personTotals[p].card;
              totals[p].voids += personTotals[p].voids;
              totals[p].returns += personTotals[p].returns;
              totals[p].total += personTotals[p].total;
          });
      });
      return totals;
    }, [salespersonTotals]);


    const isLoading = sessionLoading || salesLoading || historyLoading || usersLoading;

    if (isLoading) {
      return (
        <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
    }

    const sortedSalespersons = Object.keys(salespersonTotals).sort();
    
    return (
        <>
            <PageHeader title="Till & Cash-Up Management" />
            <div className="space-y-8">
                {/* Till Management Section */}
                <div className="grid gap-8 lg:grid-cols-2">
                    <div className="space-y-8">
                        {usersWithoutActiveSession.length > 0 && (
                            <StartSessionCard users={usersWithoutActiveSession} onStartSession={handleStartSession} />
                        )}

                        {activeSessions && activeSessions.map(session => (
                            <ActiveSessionCard 
                                key={session.id} 
                                session={session} 
                                sales={sales || []} 
                                onEndSession={(countedCash) => handleEndSession(session.id, countedCash)} 
                            />
                        ))}
                        
                        {activeSessions && activeSessions.length > 0 && usersWithoutActiveSession.length === 0 && salesUsers.length > 0 && (
                             <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-6 w-6 text-green-500" />
                                        <span>All Tills Active</span>
                                    </CardTitle>
                                    <CardDescription>All salespersons have an active till session.</CardDescription>
                                </CardHeader>
                             </Card>
                         )}

                    </div>
                    <div className="space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Landmark className="h-5 w-5 text-primary" />
                                    Till History - {format(new Date(), 'MMMM yyyy')}
                                </CardTitle>
                                <CardDescription>Complete log of all till sessions closed this month</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {historyLoading ? (
                                        <div className="flex justify-center items-center h-32">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        </div>
                                    ) : historyError ? (
                                        <p className="text-sm text-destructive text-center py-8">Error loading history: {historyError.message}</p>
                                    ) : history && history.length > 0 ? (
                                        <div className="border rounded-lg">
                                            <div className="max-h-[500px] overflow-y-auto">
                                                {history.map((h, idx) => (
                                                    <div 
                                                        key={h.id} 
                                                        className={`p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <p className="font-semibold text-sm">{h.endDate ? format(new Date(h.endDate), 'PPP') : 'N/A'}</p>
                                                                    <p className="text-xs text-muted-foreground">{h.endDate ? format(new Date(h.endDate), 'p') : ''}</p>
                                                                </div>
                                                                <p className="text-sm text-muted-foreground">Operator: <span className="font-medium text-foreground">{h.userName}</span></p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className={`font-bold text-base ${(h.difference || 0) === 0 ? 'text-foreground' : (h.difference || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {(h.difference || 0) === 0 ? '✓ Balanced' : (h.difference || 0) > 0 ? `+R${(h.difference || 0).toFixed(2)}` : `-R${Math.abs(h.difference || 0).toFixed(2)}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-3 text-xs">
                                                            <div className="bg-background rounded p-2">
                                                                <p className="text-muted-foreground">Opening</p>
                                                                <p className="font-mono font-semibold">R{(h.openingBalance || 0).toFixed(2)}</p>
                                                            </div>
                                                            <div className="bg-background rounded p-2">
                                                                <p className="text-muted-foreground">Expected</p>
                                                                <p className="font-mono font-semibold">R{(h.expectedCash || 0).toFixed(2)}</p>
                                                            </div>
                                                            <div className="bg-background rounded p-2">
                                                                <p className="text-muted-foreground">Counted</p>
                                                                <p className="font-mono font-semibold">R{(h.countedCash || 0).toFixed(2)}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <Landmark className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                                            <p className="text-sm text-muted-foreground">No closed sessions found this month</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Separator />

                {/* Cash-Up Section */}
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-4">Cash-Up Summary</h2>
                  <Accordion type="multiple" className="w-full space-y-4">
                  {sortedSalespersons.map(salesperson => (
                      <AccordionItem value={salesperson} key={salesperson} className="border rounded-lg">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline">
                          <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-primary" />
                          <span className="font-semibold text-lg">{salesperson}</span>
                          </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-6 pt-0 space-y-8">
                          <PeriodSection title="Today's Summary" stats={salespersonTotals[salesperson].today} />
                          <Separator />
                          <PeriodSection title="This Week's Summary" stats={salespersonTotals[salesperson].thisWeek} />
                          <Separator />
                          <PeriodSection title="This Month's Summary" stats={salespersonTotals[salesperson].thisMonth} />
                      </AccordionContent>
                      </AccordionItem>
                  ))}
                  </Accordion>
                </div>

                <Separator />

                <Card className="bg-muted/40">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <Users className="h-6 w-6 text-primary" />
                            <span className="text-2xl">Grand Totals (All Salespersons)</span>
                        </CardTitle>
                        <CardDescription>A combined summary of all sales activity across all staff members.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <PeriodSection title="Today's Grand Total" stats={grandTotals.today} />
                        <Separator />
                        <PeriodSection title="This Week's Grand Total" stats={grandTotals.thisWeek} />
                        <Separator />
                        <PeriodSection title="This Month's Grand Total" stats={grandTotals.thisMonth} />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
