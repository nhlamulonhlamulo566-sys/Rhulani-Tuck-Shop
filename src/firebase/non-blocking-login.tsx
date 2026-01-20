'use client';
import {
  Auth,
  signInAnonymously,
  signInWithEmailAndPassword,
  UserCredential,
} from 'firebase/auth';

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(authInstance, email, password);
}
