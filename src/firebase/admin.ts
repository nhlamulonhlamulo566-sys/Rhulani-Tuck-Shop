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

  const serviceAccountString = process.env.FIREBASE_ADMIN_SDK_CONFIG;
  let finalServiceAccountString = serviceAccountString;

  // Prefer a local `firebase-adminsdk.json` file when present (safer than relying on
  // a potentially malformed environment variable). If the file isn't present, fall
  // back to the `FIREBASE_ADMIN_SDK_CONFIG` environment variable.
  try {
    const filePath = path.join(process.cwd(), 'firebase-adminsdk.json');
    if (fs.existsSync(filePath)) {
      finalServiceAccountString = fs.readFileSync(filePath, 'utf8');
    }
  } catch (err) {
    // ignore and let the later check throw a helpful error
  }

  if (!finalServiceAccountString) {
    throw new Error('The FIREBASE_ADMIN_SDK_CONFIG environment variable is not set and no firebase-adminsdk.json file was found. This is required for server-side Firebase operations.');
  }

  try {
    // Sanitize the JSON string: trim, remove BOM, and strip markdown code fences if present.
    let jsonStr = finalServiceAccountString!.toString().trim();

    // Remove UTF-8 BOM if present
    if (jsonStr.charCodeAt(0) === 0xfeff) {
      jsonStr = jsonStr.slice(1);
    }

    // Strip fenced code blocks (e.g., ```json ... ```)
    if (jsonStr.startsWith('```')) {
      const firstNewline = jsonStr.indexOf('\n');
      if (firstNewline !== -1) {
        jsonStr = jsonStr.slice(firstNewline + 1);
        // remove trailing fence if present
        const trailingFence = jsonStr.lastIndexOf('\n```');
        if (trailingFence !== -1) {
          jsonStr = jsonStr.slice(0, trailingFence);
        }
      }
    }

    jsonStr = jsonStr.trim();

    // Helper to parse either a JSON object string or a double-encoded JSON string.
    const tryParseServiceAccount = (s: string) => {
      let out: any = JSON.parse(s);
      if (typeof out === 'string') out = JSON.parse(out);
      return out;
    };

    // First, try to parse the current string (likely from env var).
    let serviceAccount: any;
    try {
      serviceAccount = tryParseServiceAccount(jsonStr);
    } catch (firstErr) {
      // If parsing the env var failed, attempt to read a local `firebase-adminsdk.json` file
      // as a fallback (common when .env was used incorrectly).
      try {
        const filePath = path.join(process.cwd(), 'firebase-adminsdk.json');
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8').toString().trim();
          serviceAccount = tryParseServiceAccount(fileContent);
          console.warn('Falling back to firebase-adminsdk.json file for Firebase Admin credentials.');
        } else {
          throw firstErr;
        }
      } catch (secondErr) {
        // Re-throw the original parsing error to preserve the most relevant message.
        throw firstErr;
      }
    }

    return initializeApp({
      credential: cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
    }, 'admin');
  } catch (error: any) {
    console.error('Error parsing Firebase Admin SDK config or initializing app:', error);
    throw new Error(`Failed to initialize Firebase Admin SDK. Check FIREBASE_ADMIN_SDK_CONFIG or firebase-adminsdk.json: ${error?.message || error}`);
  }
}

// Get the initialized app
const adminApp = initializeAdminApp();

// Export auth and firestore instances from the named 'admin' app
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
