'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save } from 'lucide-react';
import PageHeader from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface StoreHours {
  id: string;
  dayOfWeek: string;
  openingTime: string;
  closingTime: string;
  isOpen: boolean;
}

export default function StoreHoursPage() {
  const { toast } = useToast();
  const [storeHours, setStoreHours] = useState<StoreHours[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [todayName, setTodayName] = useState<string>('');

  const fetchStoreHours = useCallback(async () => {
    try {
      const response = await fetch('/api/store-hours');
      if (!response.ok) throw new Error('Failed to fetch store hours');
      const data = await response.json();
      setStoreHours(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load store hours',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // Check user is super admin
    const user = sessionStorage.getItem('currentUser');
    if (user) {
      const userData = JSON.parse(user);
      if (userData.role !== 'Super Administration') {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'Only Super Administrators can manage store hours.',
        });
        return;
      }
      setCurrentUser(userData);
    }

    // Set current date and day name
    const now = new Date();
    setCurrentDate(now);
    const dayName = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ][now.getDay()];
    setTodayName(dayName);

    fetchStoreHours();
  }, [toast, fetchStoreHours]);

  const handleTimeChange = (dayOfWeek: string, field: 'openingTime' | 'closingTime', value: string) => {
    setStoreHours(prev =>
      prev.map(hour =>
        hour.dayOfWeek === dayOfWeek ? { ...hour, [field]: value } : hour
      )
    );
  };

  const handleIsOpenChange = (dayOfWeek: string, isOpen: boolean) => {
    setStoreHours(prev =>
      prev.map(hour =>
        hour.dayOfWeek === dayOfWeek ? { ...hour, isOpen } : hour
      )
    );
  };

  const handleSave = async (dayOfWeek: string) => {
    try {
      const hours = storeHours.find(h => h.dayOfWeek === dayOfWeek);
      if (!hours) return;

      setIsSaving(true);
      const response = await fetch('/api/store-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...hours,
          userId: currentUser?.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to save store hours');

      toast({
        title: 'Success',
        description: `${dayOfWeek} hours updated successfully`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save store hours',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to check if a day has passed
  const hasDayPassed = (dayOfWeek: string): boolean => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayIndex = days.indexOf(dayOfWeek);
    const todayIndex = new Date().getDay();
    
    // If the day index is less than today's index, it has passed this week
    return dayIndex < todayIndex;
  };

  // Get day status - Only TODAY is editable
  const getDayStatus = (dayOfWeek: string): 'today' | 'locked' => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayIndex = days.indexOf(dayOfWeek);
    const todayIndex = new Date().getDay();
    
    if (dayIndex === todayIndex) return 'today';
    return 'locked'; // All other days (past and future) are locked
  };

  // Get lock reason message
  const getLockReason = (dayOfWeek: string): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayIndex = days.indexOf(dayOfWeek);
    const todayIndex = new Date().getDay();
    
    if (dayIndex < todayIndex) {
      return 'This day has passed. It will be editable next week.';
    }
    return 'This day is locked. It will be editable when it becomes today.';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Store Hours Management" />
      <div className="grid gap-6 max-w-4xl">
        {/* Current Date Display */}
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Current Date & Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-lg font-semibold text-amber-700 mt-2">
                  {currentDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Schedule for Today</p>
                <div className="text-lg font-semibold">
                  {storeHours.find((h) => h.dayOfWeek === todayName)?.isOpen ? (
                    <>
                      <p className="text-green-600">🟢 OPEN</p>
                      <p className="text-sm text-gray-700 mt-1">
                        {storeHours.find((h) => h.dayOfWeek === todayName)?.openingTime} -{' '}
                        {storeHours.find((h) => h.dayOfWeek === todayName)?.closingTime}
                      </p>
                    </>
                  ) : (
                    <p className="text-red-600">🔴 CLOSED</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Hours Configuration</CardTitle>
            <CardDescription>
              Set opening and closing times for each day of the week. These times determine when users can login and when PINs remain valid.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {storeHours.map((hours) => {
                const dayStatus = getDayStatus(hours.dayOfWeek);
                const isEditable = dayStatus === 'today';
                const lockReason = getLockReason(hours.dayOfWeek);
                
                return (
                  <div
                    key={hours.dayOfWeek}
                    className={`border rounded-lg p-4 space-y-4 transition-all ${
                      isEditable 
                        ? 'bg-emerald-50 border-emerald-400 shadow-sm' 
                        : 'bg-gray-50 border-gray-200 opacity-75'
                    }`}
                  >
                    {/* Day Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className={`text-lg font-semibold ${isEditable ? 'text-emerald-900' : 'text-gray-500'}`}>
                          {hours.dayOfWeek}
                        </h3>
                        {isEditable && (
                          <span className="text-xs font-bold bg-emerald-600 text-white px-3 py-1 rounded-full flex items-center gap-1">
                            <span className="text-sm">●</span> EDITABLE TODAY
                          </span>
                        )}
                        {!isEditable && (
                          <span className="text-xs font-bold bg-gray-400 text-white px-3 py-1 rounded-full flex items-center gap-1">
                            <span className="text-sm">🔒</span> LOCKED
                          </span>
                        )}
                      </div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={hours.isOpen}
                          onChange={(e) =>
                            handleIsOpenChange(hours.dayOfWeek, e.target.checked)
                          }
                          disabled={!isEditable}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <span className={`text-sm font-medium ${isEditable ? 'text-gray-700' : 'text-gray-500'}`}>
                          {hours.isOpen ? 'Open' : 'Closed'}
                        </span>
                      </label>
                    </div>

                    {/* Lock Message for Non-Editable Days */}
                    {!isEditable && (
                      <div className="bg-gray-100 border border-gray-300 rounded p-3 flex items-start gap-2">
                        <span className="text-gray-500 mt-0.5">🔒</span>
                        <div>
                          <p className="text-xs font-semibold text-gray-700">Schedule Locked</p>
                          <p className="text-xs text-gray-600 mt-1">{lockReason}</p>
                        </div>
                      </div>
                    )}

                    {/* Time Inputs */}
                    {hours.isOpen && (
                      <div className={`grid grid-cols-2 gap-4 ${!isEditable ? 'opacity-60' : ''}`}>
                        <div className="space-y-2">
                          <Label className={isEditable ? 'text-gray-700' : 'text-gray-500'}>Opening Time</Label>
                          <Input
                            type="time"
                            value={hours.openingTime}
                            onChange={(e) =>
                              handleTimeChange(
                                hours.dayOfWeek,
                                'openingTime',
                                e.target.value
                              )
                            }
                            disabled={!isEditable}
                            className={isEditable ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className={isEditable ? 'text-gray-700' : 'text-gray-500'}>Closing Time</Label>
                          <Input
                            type="time"
                            value={hours.closingTime}
                            onChange={(e) =>
                              handleTimeChange(
                                hours.dayOfWeek,
                                'closingTime',
                                e.target.value
                              )
                            }
                            disabled={!isEditable}
                            className={isEditable ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'}
                          />
                        </div>
                      </div>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => handleSave(hours.dayOfWeek)}
                        disabled={!isEditable}
                        className={`text-white font-semibold ${
                          isEditable 
                            ? 'bg-emerald-600 hover:bg-emerald-700' 
                            : 'bg-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isEditable ? `Save ${hours.dayOfWeek}` : 'Locked'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Security Information Card */}
        <Card className="bg-amber-50 border-amber-300">
          <CardHeader>
            <CardTitle className="text-amber-900">🔐 Security & Lock Policy</CardTitle>
            <CardDescription className="text-amber-800">Schedule Management Controls</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-amber-900 space-y-3">
            <div className="flex gap-3">
              <span className="text-lg">🟢</span>
              <div>
                <p className="font-semibold">Today is Editable</p>
                <p className="text-xs text-amber-800 mt-1">Only the schedule for today can be modified for security and accuracy.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-lg">🔒</span>
              <div>
                <p className="font-semibold">Past Days Are Locked</p>
                <p className="text-xs text-amber-800 mt-1">Previous days cannot be edited. They will unlock next week when they become today.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-lg">⏰</span>
              <div>
                <p className="font-semibold">Future Days Are Locked</p>
                <p className="text-xs text-amber-800 mt-1">Tomorrow and upcoming days are locked until they become today, preventing premature changes.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-lg">✓</span>
              <div>
                <p className="font-semibold">Automatic Unlock</p>
                <p className="text-xs text-amber-800 mt-1">Each day automatically becomes editable at midnight when it becomes today.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">ℹ️ PIN Validity Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-2">
            <p>
              • Users can only login during store operating hours.
            </p>
            <p>
              • Login access is denied when the shop is closed.
            </p>
            <p>
              • Administrator and Super Administrator PINs are only valid during store opening hours.
            </p>
            <p>
              • Each PIN expires at the end of the business day (at closing time), not 24 hours after generation.
            </p>
            <p>
              • If you change the closing time, all PIN expiry times will be updated accordingly.
            </p>
            <p>
              • Store hours are checked automatically when users login and when validating PINs for sensitive operations.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
