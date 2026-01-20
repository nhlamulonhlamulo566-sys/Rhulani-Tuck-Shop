'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

export function initializeFirebase() {
  if (getApps().length > 0) {
    return getSdks(getApp());
  }

  if (!firebaseConfig.projectId) {
    throw new Error(
      "Firebase config missing. Check NEXT_PUBLIC_FIREBASE_* environment variables."
    );
  }

  const firebaseApp = initializeApp(firebaseConfig);
  return getSdks(firebaseApp);
}

function getSdks(firebaseApp: FirebaseApp) {
  console.log('🔥 Firebase project:', firebaseApp.options.projectId);

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
