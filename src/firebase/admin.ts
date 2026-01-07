import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Define a function to initialize the admin app to avoid top-level execution
function initializeAdminApp(): App {
  if (getApps().some(app => app.name === 'admin')) {
    return getApps().find(app => app.name === 'admin')!;
  }

  let serviceAccountString = process.env.FIREBASE_ADMIN_SDK_CONFIG;

  // If environment variable is not set, try reading local firebase-adminsdk.json
  if (!serviceAccountString) {
    try {
      const localPath = path.resolve(process.cwd(), 'firebase-adminsdk.json');
      if (fs.existsSync(localPath)) {
        serviceAccountString = fs.readFileSync(localPath, { encoding: 'utf8' });
      }
    } catch (e) {
      // ignore and let validation below handle missing config
    }
  }

  if (!serviceAccountString) {
    throw new Error('Firebase Admin SDK config not found. Set FIREBASE_ADMIN_SDK_CONFIG or provide firebase-adminsdk.json at project root.');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountString);

    return initializeApp({
      credential: cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    }, 'admin');
  } catch (error: any) {
    console.error('Error parsing Firebase Admin SDK config or initializing app:', error);
    throw new Error('Failed to initialize Firebase Admin SDK. Please check FIREBASE_ADMIN_SDK_CONFIG or firebase-adminsdk.json for valid JSON.');
  }
}

// Lazily initialize the admin app to avoid blocking imports during dev startup
let adminApp: App | null = null;
function ensureAdminApp(): App {
  if (!adminApp) {
    adminApp = initializeAdminApp();
  }
  return adminApp;
}

// Export proxies that initialize the admin app on first access so imports are cheap
export const adminAuth = new Proxy({}, {
  get(_, prop: string | symbol) {
    const app = ensureAdminApp();
    const auth = getAuth(app) as any;
    const value = auth[prop as keyof typeof auth];
    if (typeof value === 'function') return value.bind(auth);
    return value;
  }
}) as any;

export const adminDb = new Proxy({}, {
  get(_, prop: string | symbol) {
    const app = ensureAdminApp();
    const db = getFirestore(app) as any;
    const value = db[prop as keyof typeof db];
    if (typeof value === 'function') return value.bind(db);
    return value;
  }
}) as any;
