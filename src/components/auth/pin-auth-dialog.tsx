'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface PinAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (authorizingAdmin: UserProfile) => void;
  title?: string;
  description?: string;
}

export function PinAuthDialog({
  open,
  onOpenChange,
  onSuccess,
  title = 'Administrator Authorization Required',
  description = 'Please enter a valid 6-digit administrator PIN to proceed.',
}: PinAuthDialogProps) {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      toast({
        variant: 'destructive',
        title: 'Invalid PIN',
        description: 'Please enter a 6-digit PIN.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const usersRef = collection(firestore, 'users');
      const q = query(
        usersRef,
        where('pin', '==', pin),
        where('role', 'in', ['Administration', 'Super Administration'])
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Invalid PIN or user is not an administrator.');
      }

      const adminUser = querySnapshot.docs[0].data() as UserProfile;
      
      toast({
        title: 'Authorization Successful',
        description: `Authorized by ${adminUser.firstName} ${adminUser.lastName}.`,
      });
      onSuccess(adminUser);
      handleClose();

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Authorization Failed',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setIsLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleVerifyPin}>
          <div className="py-4">
            <Input
              type="password"
              placeholder="******"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="text-center text-2xl tracking-[0.5em]"
              disabled={isLoading}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || pin.length !== 6}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
