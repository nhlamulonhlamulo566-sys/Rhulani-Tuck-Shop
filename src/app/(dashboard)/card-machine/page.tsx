'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { toMoney } from '@/lib/format-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CreditCard,
  Plus,
  Settings,
  Activity,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  TestTube,
  TrendingUp,
  Shield,
  Zap,
  Globe,
  Smartphone,
  Monitor,
  Server,
  Key,
  Phone,
  Mail,
  Clock,
  DollarSign,
  Receipt,
  BarChart3,
  Loader2,
  Square,
  Building2
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CardMachine {
  id: string;
  deviceName: string;
  serialNumber: string;
  deviceType: 'Verifone' | 'Ingenico' | 'PAX' | 'Square' | 'Other';
  port: string;
  baudRate: number;
  ipAddress?: string;
  port_number?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MerchantGateway {
  id: string;
  merchantName: string;
  merchantId: string;
  apiKey: string;
  apiSecret: string;
  gatewayType: 'Payfast' | 'PayU' | 'Stripe' | 'Square' | 'Capitec' | 'Nedbank' | 'FNB' | 'ABSA' | 'Custom';
  testMode: boolean;
  isActive: boolean;
  contactEmail?: string;
  contactPhone?: string;
  supportContact?: string;
  createdAt: string;
  updatedAt: string;
}

interface MachineHealth {
  id: string;
  machineId: string;
  deviceName: string;
  serialNumber: string;
  deviceType: string;
  isActive: boolean;
  connectionStatus: 'Connected' | 'Disconnected' | 'Error';
  signalStrength?: number;
  lastHeartbeat?: string;
  errorMessage?: string;
  lastCheck: string;
}

interface TransactionLog {
  id: string;
  machineId: string;
  merchantId: string;
  transactionId: string;
  amount: number;
  currency: string;
  cardLastFour?: string;
  cardType: string;
  transactionStatus: 'Success' | 'Failed' | 'Pending' | 'Declined';
  responseCode?: string;
  responseMessage?: string;
  deviceName?: string;
  merchantName?: string;
  createdAt: string;
}

export default function CardMachinePage() {
  const [machines, setMachines] = useState<CardMachine[]>([]);
  const [gateways, setGateways] = useState<MerchantGateway[]>([]);
  const [healthData, setHealthData] = useState<MachineHealth[]>([]);
  const [transactions, setTransactions] = useState<TransactionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('machines');
  const [showMachineDialog, setShowMachineDialog] = useState(false);
  const [showGatewayDialog, setShowGatewayDialog] = useState(false);
  const [editingMachine, setEditingMachine] = useState<CardMachine | null>(null);
  const [editingGateway, setEditingGateway] = useState<MerchantGateway | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [showApiSecret, setShowApiSecret] = useState<string | null>(null);
  const { toast } = useToast();

  // Form states
  const [machineForm, setMachineForm] = useState<{
    deviceName: string;
    serialNumber: string;
    deviceType: CardMachine['deviceType'];
    port: string;
    baudRate: number;
    ipAddress: string;
    port_number: string;
    isActive: boolean;
  }>({
    deviceName: '',
    serialNumber: '',
    deviceType: 'Verifone',
    port: 'COM1',
    baudRate: 9600,
    ipAddress: '',
    port_number: '',
    isActive: true
  });

  const [gatewayForm, setGatewayForm] = useState<{
    merchantName: string;
    merchantId: string;
    apiKey: string;
    apiSecret: string;
    gatewayType: MerchantGateway['gatewayType'];
    testMode: boolean;
    isActive: boolean;
    contactEmail: string;
    contactPhone: string;
    supportContact: string;
  }>({
    merchantName: '',
    merchantId: '',
    apiKey: '',
    apiSecret: '',
    gatewayType: 'Payfast',
    testMode: true,
    isActive: true,
    contactEmail: '',
    contactPhone: '',
    supportContact: ''
  });

  const loadMachines = useCallback(async () => {
    const response = await fetch('/api/card-machine');
    if (response.ok) {
      const data = await response.json();
      setMachines(data);
    }
  }, []);

  const loadGateways = useCallback(async () => {
    const response = await fetch('/api/card-machine?action=gateways');
    if (response.ok) {
      const data = await response.json();
      setGateways(data);
    }
  }, []);

  const loadHealthData = useCallback(async () => {
    const response = await fetch('/api/card-machine?action=health');
    if (response.ok) {
      const data = await response.json();
      setHealthData(data);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    const response = await fetch('/api/card-machine?action=transactions&limit=20');
    if (response.ok) {
      const data = await response.json();
      setTransactions(data);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMachines(),
        loadGateways(),
        loadHealthData(),
        loadTransactions()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load card machine data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [loadMachines, loadGateways, loadHealthData, loadTransactions, toast]);

  useEffect(() => {
    loadData();
    // Auto-refresh health data every 30 seconds
    const interval = setInterval(() => {
      if (activeTab === 'health') {
        loadHealthData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab, loadData, loadHealthData]);

  const handleCreateMachine = async () => {
    try {
      const response = await fetch('/api/card-machine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'machine', ...machineForm }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Card machine created successfully',
        });
        setShowMachineDialog(false);
        resetMachineForm();
        loadMachines();
        loadHealthData();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create card machine',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create card machine',
        variant: 'destructive',
      });
    }
  };

  const handleCreateGateway = async () => {
    try {
      const response = await fetch('/api/card-machine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'gateway', ...gatewayForm }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Merchant gateway created successfully',
        });
        setShowGatewayDialog(false);
        resetGatewayForm();
        loadGateways();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create merchant gateway',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create merchant gateway',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateMachine = async () => {
    if (!editingMachine) return;

    try {
      const response = await fetch('/api/card-machine', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'machine', id: editingMachine.id, ...machineForm }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Card machine updated successfully',
        });
        setShowMachineDialog(false);
        setEditingMachine(null);
        resetMachineForm();
        loadMachines();
        loadHealthData();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update card machine',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update card machine',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateGateway = async () => {
    if (!editingGateway) return;

    try {
      const response = await fetch('/api/card-machine', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'gateway', id: editingGateway.id, ...gatewayForm }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Merchant gateway updated successfully',
        });
        setShowGatewayDialog(false);
        setEditingGateway(null);
        resetGatewayForm();
        loadGateways();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update merchant gateway',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update merchant gateway',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMachine = async (id: string) => {
    if (!confirm('Are you sure you want to delete this card machine?')) return;

    try {
      const response = await fetch(`/api/card-machine?type=machine&id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Card machine deleted successfully',
        });
        loadMachines();
        loadHealthData();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete card machine',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete card machine',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteGateway = async (id: string) => {
    if (!confirm('Are you sure you want to delete this merchant gateway?')) return;

    try {
      const response = await fetch(`/api/card-machine?type=gateway&id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Merchant gateway deleted successfully',
        });
        loadGateways();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete merchant gateway',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete merchant gateway',
        variant: 'destructive',
      });
    }
  };

  const handleTestConnection = async (machineId: string) => {
    setTestingConnection(machineId);
    try {
      const response = await fetch('/api/card-machine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test-connection', machineId }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: data.connected ? 'Connection Successful' : 'Connection Failed',
          description: data.message,
          variant: data.connected ? 'default' : 'destructive',
        });
        loadHealthData();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to test connection',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to test connection',
        variant: 'destructive',
      });
    } finally {
      setTestingConnection(null);
    }
  };

  const resetMachineForm = () => {
    setMachineForm({
      deviceName: '',
      serialNumber: '',
      deviceType: 'Verifone',
      port: 'COM1',
      baudRate: 9600,
      ipAddress: '',
      port_number: '',
      isActive: true
    });
  };

  const resetGatewayForm = () => {
    setGatewayForm({
      merchantName: '',
      merchantId: '',
      apiKey: '',
      apiSecret: '',
      gatewayType: 'Payfast',
      testMode: true,
      isActive: true,
      contactEmail: '',
      contactPhone: '',
      supportContact: ''
    });
  };

  const openEditMachine = (machine: CardMachine) => {
    setEditingMachine(machine);
    setMachineForm({
      deviceName: machine.deviceName,
      serialNumber: machine.serialNumber,
      deviceType: machine.deviceType,
      port: machine.port,
      baudRate: machine.baudRate,
      ipAddress: machine.ipAddress || '',
      port_number: machine.port_number?.toString() || '',
      isActive: machine.isActive
    });
    setShowMachineDialog(true);
  };

  const openEditGateway = (gateway: MerchantGateway) => {
    setEditingGateway(gateway);
    setGatewayForm({
      merchantName: gateway.merchantName,
      merchantId: gateway.merchantId,
      apiKey: gateway.apiKey,
      apiSecret: gateway.apiSecret,
      gatewayType: gateway.gatewayType,
      testMode: gateway.testMode,
      isActive: gateway.isActive,
      contactEmail: gateway.contactEmail || '',
      contactPhone: gateway.contactPhone || '',
      supportContact: gateway.supportContact || ''
    });
    setShowGatewayDialog(true);
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'Verifone': return <Smartphone className="w-5 h-5" />;
      case 'Ingenico': return <Monitor className="w-5 h-5" />;
      case 'PAX': return <Server className="w-5 h-5" />;
      case 'Square': return <CreditCard className="w-5 h-5" />;
      default: return <Monitor className="w-5 h-5" />;
    }
  };

  const getGatewayIcon = (gatewayType: string) => {
    switch (gatewayType) {
      case 'Payfast': return <Zap className="w-5 h-5" />;
      case 'PayU': return <Globe className="w-5 h-5" />;
      case 'Stripe': return <CreditCard className="w-5 h-5" />;
      case 'Square': return <Square className="w-5 h-5" />;
      case 'Capitec': return <Building2 className="w-5 h-5" />;
      case 'Nedbank': return <Building2 className="w-5 h-5" />;
      case 'FNB': return <Building2 className="w-5 h-5" />;
      case 'ABSA': return <Building2 className="w-5 h-5" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Connected': return 'bg-green-100 text-green-800 border-green-300';
      case 'Success': return 'bg-green-100 text-green-800 border-green-300';
      case 'Disconnected': return 'bg-red-100 text-red-800 border-red-300';
      case 'Failed': return 'bg-red-100 text-red-800 border-red-300';
      case 'Error': return 'bg-red-100 text-red-800 border-red-300';
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Declined': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Connected': return <CheckCircle2 className="w-4 h-4" />;
      case 'Success': return <CheckCircle2 className="w-4 h-4" />;
      case 'Disconnected': return <WifiOff className="w-4 h-4" />;
      case 'Failed': return <AlertCircle className="w-4 h-4" />;
      case 'Error': return <AlertCircle className="w-4 h-4" />;
      case 'Pending': return <Clock className="w-4 h-4" />;
      case 'Declined': return <AlertCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 p-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Card Machine Integration</h1>
          <p className="text-gray-600 mt-2">Loading card machine configuration...</p>
        </div>
        <div className="grid grid-cols-1 gap-6">
          <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Card Machine Integration</h1>
          <p className="text-gray-600 mt-2">
            Configure and manage card payment devices and merchant gateways
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Machines</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{machines.filter(m => m.isActive).length}</div>
            <p className="text-xs text-muted-foreground">
              of {machines.length} total machines
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {healthData.filter(h => h.connectionStatus === 'Connected').length}
            </div>
            <p className="text-xs text-muted-foreground">
              machines online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Gateways</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gateways.filter(g => g.isActive).length}</div>
            <p className="text-xs text-muted-foreground">
              of {gateways.length} total gateways
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions Today</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactions.filter(t => {
                const today = new Date().toDateString();
                return new Date(t.createdAt).toDateString() === today;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              successful payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="machines">Card Machines</TabsTrigger>
          <TabsTrigger value="gateways">Merchant Gateways</TabsTrigger>
          <TabsTrigger value="health">Health Monitor</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        {/* Card Machines Tab */}
        <TabsContent value="machines" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Card Machines</CardTitle>
                  <CardDescription>
                    Configure and manage your card payment devices
                  </CardDescription>
                </div>
                <Dialog open={showMachineDialog} onOpenChange={setShowMachineDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditingMachine(null); resetMachineForm(); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Machine
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingMachine ? 'Edit Card Machine' : 'Add New Card Machine'}
                      </DialogTitle>
                      <DialogDescription>
                        Configure your card payment device settings
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="deviceName">Device Name</Label>
                        <Input
                          id="deviceName"
                          value={machineForm.deviceName}
                          onChange={(e) => setMachineForm(prev => ({ ...prev, deviceName: e.target.value }))}
                          placeholder="e.g., Main Counter Terminal"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="serialNumber">Serial Number</Label>
                        <Input
                          id="serialNumber"
                          value={machineForm.serialNumber}
                          onChange={(e) => setMachineForm(prev => ({ ...prev, serialNumber: e.target.value }))}
                          placeholder="e.g., VF123456789"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deviceType">Device Type</Label>
                        <Select
                          value={machineForm.deviceType}
                          onValueChange={(value: any) => setMachineForm(prev => ({ ...prev, deviceType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Verifone">Verifone</SelectItem>
                            <SelectItem value="Ingenico">Ingenico</SelectItem>
                            <SelectItem value="PAX">PAX</SelectItem>
                            <SelectItem value="Square">Square</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="port">Port</Label>
                        <Input
                          id="port"
                          value={machineForm.port}
                          onChange={(e) => setMachineForm(prev => ({ ...prev, port: e.target.value }))}
                          placeholder="e.g., COM1 or /dev/ttyUSB0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="baudRate">Baud Rate</Label>
                        <Select
                          value={machineForm.baudRate.toString()}
                          onValueChange={(value) => setMachineForm(prev => ({ ...prev, baudRate: parseInt(value) }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="9600">9600</SelectItem>
                            <SelectItem value="19200">19200</SelectItem>
                            <SelectItem value="38400">38400</SelectItem>
                            <SelectItem value="57600">57600</SelectItem>
                            <SelectItem value="115200">115200</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ipAddress">IP Address (Optional)</Label>
                        <Input
                          id="ipAddress"
                          value={machineForm.ipAddress}
                          onChange={(e) => setMachineForm(prev => ({ ...prev, ipAddress: e.target.value }))}
                          placeholder="192.168.1.100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="port_number">Network Port (Optional)</Label>
                        <Input
                          id="port_number"
                          value={machineForm.port_number}
                          onChange={(e) => setMachineForm(prev => ({ ...prev, port_number: e.target.value }))}
                          placeholder="8080"
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <Switch
                          id="isActive"
                          checked={machineForm.isActive}
                          onCheckedChange={(checked) => setMachineForm(prev => ({ ...prev, isActive: checked }))}
                        />
                        <Label htmlFor="isActive">Active</Label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowMachineDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={editingMachine ? handleUpdateMachine : handleCreateMachine}>
                        {editingMachine ? 'Update' : 'Create'} Machine
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machines.map((machine) => (
                    <TableRow key={machine.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(machine.deviceType)}
                          <div>
                            <div className="font-medium">{machine.deviceName}</div>
                            <div className="text-sm text-gray-500">{machine.serialNumber}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{machine.deviceType}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {machine.port}
                          {machine.ipAddress && (
                            <div className="text-gray-500">{machine.ipAddress}:{machine.port_number}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={machine.isActive ? "default" : "secondary"}>
                          {machine.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTestConnection(machine.id)}
                            disabled={testingConnection === machine.id}
                          >
                            {testingConnection === machine.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <TestTube className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditMachine(machine)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteMachine(machine.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {machines.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No card machines configured yet. Add a machine to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Merchant Gateways Tab */}
        <TabsContent value="gateways" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Merchant Gateways</CardTitle>
                  <CardDescription>
                    Configure payment processor integrations
                  </CardDescription>
                </div>
                <Dialog open={showGatewayDialog} onOpenChange={setShowGatewayDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditingGateway(null); resetGatewayForm(); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Gateway
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingGateway ? 'Edit Merchant Gateway' : 'Add New Merchant Gateway'}
                      </DialogTitle>
                      <DialogDescription>
                        Configure your payment processor settings
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="merchantName">Merchant Name</Label>
                        <Input
                          id="merchantName"
                          value={gatewayForm.merchantName}
                          onChange={(e) => setGatewayForm(prev => ({ ...prev, merchantName: e.target.value }))}
                          placeholder="e.g., Rhulani Tuck Shop"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="merchantId">Merchant ID</Label>
                        <Input
                          id="merchantId"
                          value={gatewayForm.merchantId}
                          onChange={(e) => setGatewayForm(prev => ({ ...prev, merchantId: e.target.value }))}
                          placeholder="e.g., MERCH123456"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gatewayType">Gateway Type</Label>
                        <Select
                          value={gatewayForm.gatewayType}
                          onValueChange={(value: any) => setGatewayForm(prev => ({ ...prev, gatewayType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Payfast">Payfast</SelectItem>
                            <SelectItem value="Capitec">Capitec</SelectItem>
                            <SelectItem value="Nedbank">Nedbank</SelectItem>
                            <SelectItem value="FNB">FNB</SelectItem>
                            <SelectItem value="ABSA">ABSA</SelectItem>
                            <SelectItem value="PayU">PayU</SelectItem>
                            <SelectItem value="Stripe">Stripe</SelectItem>
                            <SelectItem value="Square">Square</SelectItem>
                            <SelectItem value="Custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactEmail">Contact Email</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={gatewayForm.contactEmail}
                          onChange={(e) => setGatewayForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                          placeholder="support@merchant.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="apiKey">API Key</Label>
                        <div className="relative">
                          <Input
                            id="apiKey"
                            type={showApiKey === 'apiKey' ? 'text' : 'password'}
                            value={gatewayForm.apiKey}
                            onChange={(e) => setGatewayForm(prev => ({ ...prev, apiKey: e.target.value }))}
                            placeholder="Enter API key"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowApiKey(showApiKey === 'apiKey' ? null : 'apiKey')}
                          >
                            {showApiKey === 'apiKey' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="apiSecret">API Secret</Label>
                        <div className="relative">
                          <Input
                            id="apiSecret"
                            type={showApiSecret === 'apiSecret' ? 'text' : 'password'}
                            value={gatewayForm.apiSecret}
                            onChange={(e) => setGatewayForm(prev => ({ ...prev, apiSecret: e.target.value }))}
                            placeholder="Enter API secret"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowApiSecret(showApiSecret === 'apiSecret' ? null : 'apiSecret')}
                          >
                            {showApiSecret === 'apiSecret' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactPhone">Contact Phone</Label>
                        <Input
                          id="contactPhone"
                          value={gatewayForm.contactPhone}
                          onChange={(e) => setGatewayForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                          placeholder="+27 12 345 6789"
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="supportContact">Support Contact Info</Label>
                        <Textarea
                          id="supportContact"
                          value={gatewayForm.supportContact}
                          onChange={(e) => setGatewayForm(prev => ({ ...prev, supportContact: e.target.value }))}
                          placeholder="Additional support contact information..."
                          rows={3}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="testMode"
                          checked={gatewayForm.testMode}
                          onCheckedChange={(checked) => setGatewayForm(prev => ({ ...prev, testMode: checked }))}
                        />
                        <Label htmlFor="testMode">Test Mode</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={gatewayForm.isActive}
                          onCheckedChange={(checked) => setGatewayForm(prev => ({ ...prev, isActive: checked }))}
                        />
                        <Label htmlFor="isActive">Active</Label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowGatewayDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={editingGateway ? handleUpdateGateway : handleCreateGateway}>
                        {editingGateway ? 'Update' : 'Create'} Gateway
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gateways.map((gateway) => (
                    <TableRow key={gateway.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getGatewayIcon(gateway.gatewayType)}
                          <div>
                            <div className="font-medium">{gateway.merchantName}</div>
                            <div className="text-sm text-gray-500">{gateway.merchantId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{gateway.gatewayType}</TableCell>
                      <TableCell>
                        <Badge variant={gateway.testMode ? "secondary" : "default"}>
                          {gateway.testMode ? 'Test' : 'Live'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={gateway.isActive ? "default" : "secondary"}>
                          {gateway.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditGateway(gateway)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteGateway(gateway.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {gateways.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No merchant gateways configured yet. Add a gateway to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Monitor Tab */}
        <TabsContent value="health" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Device Health Monitor</CardTitle>
              <CardDescription>
                Real-time status of all card machines and connection health
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Signal</TableHead>
                    <TableHead>Last Check</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthData.map((health) => (
                    <TableRow key={health.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(health.deviceType)}
                          <div>
                            <div className="font-medium">{health.deviceName}</div>
                            <div className="text-sm text-gray-500">{health.serialNumber}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(health.connectionStatus)}>
                          {getStatusIcon(health.connectionStatus)}
                          {health.connectionStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {health.signalStrength !== undefined ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${health.signalStrength}%` }}
                              />
                            </div>
                            <span className="text-sm">{health.signalStrength}%</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {health.lastCheck ? new Date(health.lastCheck).toLocaleString() : 'Never'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTestConnection(health.machineId)}
                            disabled={testingConnection === health.machineId}
                          >
                            {testingConnection === health.machineId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <TestTube className="w-4 h-4" />
                            )}
                          </Button>
                          {health.errorMessage && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => alert(`Error: ${health.errorMessage}`)}
                            >
                              <AlertCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {healthData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No health data available. Configure card machines first.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Recent card payment transactions and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="font-mono text-sm">{transaction.transactionId}</div>
                        {transaction.cardLastFour && (
                          <div className="text-xs text-gray-500">
                            **** **** **** {transaction.cardLastFour}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {toMoney(transaction.amount)} {transaction.currency}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(transaction.transactionStatus)}>
                          {getStatusIcon(transaction.transactionStatus)}
                          {transaction.transactionStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.deviceName || 'Unknown'}</TableCell>
                      <TableCell>{transaction.merchantName || 'Unknown'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {transactions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No transactions recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
