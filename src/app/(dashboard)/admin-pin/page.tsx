'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock, RefreshCw, Copy } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PINInfo {
  id: string;
  firstName: string;
  lastName: string;
  pin: string | null;
  expiresAt: string | null;
  status: 'active' | 'expired' | 'no_pin';
  hoursRemaining: number;
}

interface TimeRemaining {
  hours: number;
  minutes: number;
  totalMinutes: number;
  closingHour: number;
}

export default function AdminPINPage() {
  const [user, setUser] = useState<any>(null);
  const [pinInfo, setPinInfo] = useState<PINInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Calculate time remaining until closing time
  const calculateTimeRemaining = useCallback(async () => {
    try {
      const response = await fetch(`/api/store-hours?_t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch store hours');
      const storeHours = await response.json();
      
      const now = new Date();
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
      const todayHours = storeHours.find((h: any) => h.dayOfWeek === dayOfWeek);
      
      if (!todayHours) {
        setTimeRemaining(null);
        return;
      }

      // Parse closing time (HH:mm:ss format)
      const [closingHour, closingMin] = todayHours.closingTime.split(':').map(Number);
      const closingDate = new Date();
      closingDate.setHours(closingHour, closingMin, 0, 0);

      // Calculate difference in milliseconds
      const diffMs = closingDate.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, totalMinutes: 0, closingHour });
        return;
      }

      const totalMinutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      setTimeRemaining({ hours, minutes, totalMinutes, closingHour });
    } catch (error) {
      console.error('Error calculating time remaining:', error);
      setTimeRemaining(null);
    }
  }, []);

  const fetchPINInfo = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/auth/generate-pin?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setPinInfo(data);
      } else {
        console.error('Failed to fetch PIN info:', response.statusText);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load PIN information',
        });
      }
    } catch (error) {
      console.error('Error fetching PIN info:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load PIN information',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Load user from sessionStorage
  useEffect(() => {
    const userData = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('currentUser') || '{}') : null;
    setUser(userData);
  }, []);

  // Fetch PIN info and calculate time remaining when user is available
  useEffect(() => {
    if (user?.id) {
      fetchPINInfo();
      calculateTimeRemaining();

      const refreshOnFocus = () => {
        fetchPINInfo();
        calculateTimeRemaining();
      };

      window.addEventListener('focus', refreshOnFocus);

      // Refresh PIN info and time remaining every 30 seconds
      const interval = setInterval(() => {
        fetchPINInfo();
        calculateTimeRemaining();
      }, 30000);

      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', refreshOnFocus);
      };
    } else {
      setLoading(false);
    }
  }, [user, fetchPINInfo, calculateTimeRemaining]);

  const handleGenerateNewPIN = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/auth/generate-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setPinInfo(prev => prev ? {
          ...prev,
          pin: data.pin,
          expiresAt: data.expiresAt,
          status: 'active',
          hoursRemaining: 24,
        } : null);
        toast({
          title: 'Success',
          description: 'New PIN generated successfully!',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to generate new PIN',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate new PIN',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyPIN = async () => {
    if (pinInfo?.pin) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(pinInfo.pin);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          toast({
            title: 'Copied',
            description: 'PIN copied to clipboard',
          });
        } else {
          // Fallback for browsers that don't support clipboard API
          const textArea = document.createElement('textarea');
          textArea.value = pinInfo.pin;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          toast({
            title: 'Copied',
            description: 'PIN copied to clipboard',
          });
        }
      } catch (error) {
        console.error('Failed to copy PIN:', error);
        toast({
          title: 'Error',
          description: 'Failed to copy PIN to clipboard',
          variant: 'destructive',
        });
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'expired':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 p-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin PIN Management</h1>
          <p className="text-gray-600 mt-2">Loading PIN information...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin PIN Management</h1>
        <p className="text-gray-600 mt-2">
          Generate and manage your daily 6-digit PIN for administrative access
        </p>
      </div>

      {/* Info Alert */}
      {pinInfo?.status === 'expired' && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Your PIN has expired. Generate a new PIN to continue using administrative features.
          </AlertDescription>
        </Alert>
      )}

      {pinInfo?.status === 'no_pin' && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            No PIN generated yet. Create your first PIN to get started.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current PIN Card */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Current PIN</CardTitle>
            <CardDescription>Your active administrative PIN</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {pinInfo?.pin && pinInfo?.status === 'active' ? (
              <>
                {/* PIN Display */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 text-center">
                  <p className="text-sm font-medium text-gray-600 mb-2">Your PIN</p>
                  <p className="text-5xl font-bold text-blue-600 font-mono tracking-widest mb-4">
                    {pinInfo.pin}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyPIN}
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Copy PIN'}
                  </Button>
                </div>

                {/* Status Badges */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={`${getStatusColor('active')} gap-2`}>
                      {getStatusIcon('active')}
                      Active
                    </Badge>
                  </div>

                  {/* Time Remaining */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">Time Remaining</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          calculateTimeRemaining();
                          fetchPINInfo();
                          toast({
                            title: 'Refreshed',
                            description: 'Store hours and PIN info updated',
                          });
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Refresh
                      </Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">
                            {timeRemaining ? (
                              <>
                                {timeRemaining.hours} hour{timeRemaining.hours !== 1 ? 's' : ''}{' '}
                                {timeRemaining.minutes} minute{timeRemaining.minutes !== 1 ? 's' : ''}
                              </>
                            ) : (
                              'Loading...'
                            )}
                          </span>
                          <span className="text-xs text-gray-500">
                            {timeRemaining ? `${timeRemaining.closingHour}:00 closing` : ''}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                              width: timeRemaining ? `${Math.max(0, Math.min(100, (timeRemaining.totalMinutes / (timeRemaining.closingHour * 60)) * 100))}%` : '0%',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expiry Time */}
                  {pinInfo.expiresAt && (
                    <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                      Expires: {new Date(pinInfo.expiresAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No Active PIN</p>
                <p className="text-sm text-gray-500 mt-1">Generate a new PIN to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generate New PIN Card */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Generate New PIN</CardTitle>
            <CardDescription>Create your daily PIN for tomorrow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Administrator</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {pinInfo?.firstName} {pinInfo?.lastName}
              </p>
              <p className="text-sm text-gray-600 mt-2">{user?.workNumber || user?.email}</p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Every PIN expires at the end of the business day (at closing time).</span> Your PIN will automatically expire when the store closes, ensuring security.
              </p>
            </div>

            {/* Generate Button */}
            <div className="space-y-3">
              <Button
                onClick={handleGenerateNewPIN}
                disabled={generating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 gap-2"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Generate New PIN
                  </>
                )}
              </Button>

              {pinInfo?.status === 'expired' && (
                <div className="text-xs text-center text-red-600 font-medium">
                  Your PIN has expired. Please generate a new one.
                </div>
              )}
            </div>

            {/* Features List */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">PIN Features</p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-2 items-start">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>6-digit random PIN generated daily</span>
                </li>
                <li className="flex gap-2 items-start">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Expires at store closing time each day</span>
                </li>
                <li className="flex gap-2 items-start">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Required for admin-only operations</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PIN History Info */}
      <Card className="shadow-lg border-gray-200">
        <CardHeader>
          <CardTitle>About Your PIN</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">PIN Length</p>
              <p className="text-2xl font-bold text-gray-900">6 Digits</p>
              <p className="text-xs text-gray-500 mt-1">Randomly generated each day</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Valid Duration</p>
              <p className="text-2xl font-bold text-gray-900">Until Closing</p>
              <p className="text-xs text-gray-500 mt-1">Expires at store closing time</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Use Cases</p>
              <p className="text-2xl font-bold text-gray-900">Admin</p>
              <p className="text-xs text-gray-500 mt-1">Secure admin access</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
