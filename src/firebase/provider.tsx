'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useState,
  useEffect,
} from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import FirebaseErrorListener from '@/components/FirebaseErrorListener';
import { useMemo as useMemoFirebase } from 'react';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(
  undefined
);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  // Subscribe to auth state once
  useEffect(() => {
    if (!auth) {
      setUserAuthState({
        user: null,
        isUserLoading: false,
        userError: new Error('Auth service not provided.'),
      });
      return;
    }

    setUserAuthState({ user: null, isUserLoading: true, userError: null });

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) =>
        setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null }),
      (error) =>
        setUserAuthState({ user: null, isUserLoading: false, userError: error })
    );

    return () => unsubscribe();
  }, [auth]);

  const contextValue = useMemo<FirebaseContextState>(() => {
    const available = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: available,
      firebaseApp: available ? firebaseApp : null,
      firestore: available ? firestore : null,
      auth: available ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

// Main hook for Firebase + auth state
export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context)
    throw new Error('useFirebase must be used within FirebaseProvider.');
  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth)
    throw new Error('Firebase core services not available.');
  return context;
};

export const useAuth = () => useFirebase().auth!;
export const useFirestore = () => useFirebase().firestore!;
export const useFirebaseApp = () => useFirebase().firebaseApp!;

export const useUserAuth = () => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};

// Re-exporting from the new utility file
export * from './provider.utils';
