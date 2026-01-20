'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import type { UserProfile } from '@/lib/types';

// Context for core Firebase services
export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
}

// Context for custom user authentication state
export interface UserContextState {
  user: UserProfile | null;
  isUserLoading: boolean;
  login: (user: UserProfile) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextState | undefined>(undefined);
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

interface FirebaseProviderProps {
    children: ReactNode;
    firebaseApp: FirebaseApp;
    firestore: Firestore;
    auth: Auth;
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isUserLoading, setIsLoading] = useState(true);

  // This effect runs on the client to check for a user session in sessionStorage
  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('authUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Could not parse user from session storage", error);
      sessionStorage.removeItem('authUser');
    }
    setIsLoading(false);
  }, []);

  const login = (loggedInUser: UserProfile) => {
    // Create a copy of the user object to avoid modifying the original
    const userToStore = { ...loggedInUser };
    // Do not store the password in session storage for security reasons
    delete userToStore.password;
    sessionStorage.setItem('authUser', JSON.stringify(userToStore));
    setUser(loggedInUser);
  };

  const logout = () => {
    sessionStorage.removeItem('authUser');
    setUser(null);
  };

  const userContextValue = useMemo(() => ({
    user,
    isUserLoading,
    login,
    logout,
  }), [user, isUserLoading]);
  
  const firebaseContextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
    };
  }, [firebaseApp, firestore, auth]);

  return (
    <UserContext.Provider value={userContextValue}>
      <FirebaseContext.Provider value={firebaseContextValue}>
        {children}
      </FirebaseContext.Provider>
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextState => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a FirebaseProvider');
  }
  return context;
};

const useFirebaseInternal = () => {
    const context = useContext(FirebaseContext);
    if (context === undefined) {
        throw new Error('useFirebase must be used within a FirebaseProvider.');
    }
    if (!context.areServicesAvailable) {
        throw new Error('Firebase core services not available. Check FirebaseProvider props.');
    }
    return context;
}

export const useAuth = (): Auth => useFirebaseInternal().auth;
export const useFirestore = (): Firestore => useFirebaseInternal().firestore;
export const useFirebaseApp = (): FirebaseApp => useFirebaseInternal().firebaseApp;

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}
