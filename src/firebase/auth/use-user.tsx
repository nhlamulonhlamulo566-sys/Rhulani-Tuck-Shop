'use client';

import { doc } from 'firebase/firestore';
import { useFirestore, useUserAuth } from '../provider';
import { useMemoFirebase } from '../provider.utils';
import { useDoc } from '../firestore/use-doc';
import type { UserProfile } from '@/lib/types';
import type { User } from 'firebase/auth';

type UseUserReturn = {
  user: (User & UserProfile) | null;
  loading: boolean;
};

export function useUser(): UseUserReturn {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUserAuth();

  const userProfileRef = useMemoFirebase(
    user ? doc(firestore, 'users', user.uid) : null,
    'userProfileRef',
    [user, firestore]
  );
  
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(
    userProfileRef
  );

  const loading = isUserLoading || (!!user && profileLoading);

  if (loading || !user) {
    return { user: null, loading };
  }

  // If there is a user but no profile yet, we are still technically loading the full user object
  if (!userProfile) return { user: null, loading: true };

  return { user: { ...user, ...userProfile } as User & UserProfile, loading: false };
}
