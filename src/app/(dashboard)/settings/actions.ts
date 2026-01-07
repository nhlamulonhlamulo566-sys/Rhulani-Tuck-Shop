'use server';

import { adminAuth, adminDb } from '@/firebase/admin';
import type { UserProfile } from '@/lib/types';

interface CreateUserActionInput {
    email: string;
    password?: string;
    displayName: string;
    role: 'administration' | 'sales';
}

export async function createUserAction(
  input: CreateUserActionInput
): Promise<{ uid: string | null; error: string | null }> {
  try {
    // Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
      emailVerified: true, // Or based on your flow
    });

    // Create user profile in Firestore
    const userRef = adminDb.collection('users').doc(userRecord.uid);
    
    const newUserProfile: UserProfile = {
      id: userRecord.uid,
      name: input.displayName,
      email: input.email,
      avatarUrl: '', // You can add a default avatar URL here
      role: input.role,
    };

    await userRef.set(newUserProfile);

    // Optionally set custom claims for roles
    await adminAuth.setCustomUserClaims(userRecord.uid, { role: input.role });

    return { uid: userRecord.uid, error: null };
  } catch (error: any) {
    console.error('Error creating user:', error);
    // Return a more specific error message if available
    return { uid: null, error: error.message || 'An unexpected error occurred.' };
  }
}
