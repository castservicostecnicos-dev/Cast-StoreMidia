import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, Firestore } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let firestoreInstance: Firestore | null = null;
let lastSyncTimestamp: string | null = null;
let lastSyncError: string | null = null;
let isSyncing = false;
let pendingDataToSync: any = null;
let syncDebounceTimer: NodeJS.Timeout | null = null;

export function getFirestoreDb(): Firestore | null {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.warn('[Firebase] firebase-applet-config.json not found.');
      return null;
    }

    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);

    if (!config.projectId || !config.apiKey) {
      console.warn('[Firebase] Incomplete Firebase configuration in firebase-applet-config.json.');
      return null;
    }

    const app = getApps().length > 0
      ? getApp()
      : initializeApp({
          projectId: config.projectId,
          apiKey: config.apiKey,
          appId: config.appId,
          authDomain: config.authDomain,
        });

    firestoreInstance = config.firestoreDatabaseId
      ? getFirestore(app, config.firestoreDatabaseId)
      : getFirestore(app);

    console.log(`[Firebase Firestore] Connected to project: ${config.projectId} (${config.firestoreDatabaseId || 'default'})`);
    return firestoreInstance;
  } catch (err: any) {
    console.error('[Firebase Firestore] Failed to initialize Firestore:', err?.message || err);
    lastSyncError = err?.message || 'Initialization failed';
    return null;
  }
}

/**
 * Load database snapshot from Firebase Firestore
 */
export async function loadDatabaseFromFirestore(): Promise<any | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    const targetDoc = doc(db, 'app_data', 'indoor_media_db');
    const snap = await getDoc(targetDoc);

    if (!snap.exists()) {
      console.log('[Firebase Firestore] No existing database snapshot found in Firestore yet.');
      return null;
    }

    const docData = snap.data();
    if (!docData || !docData.data) {
      console.warn('[Firebase Firestore] Snapshot document is empty.');
      return null;
    }

    const parsed = JSON.parse(docData.data);
    lastSyncTimestamp = docData.updated_at || new Date().toISOString();
    console.log(`[Firebase Firestore] Successfully restored database! Companies: ${parsed.companies?.length || 0}, Players: ${parsed.players?.length || 0}`);
    return parsed;
  } catch (err: any) {
    console.error('[Firebase Firestore] Error reading from Firestore:', err?.message || err);
    lastSyncError = err?.message || 'Error reading from Firestore';
    return null;
  }
}

/**
 * Save database snapshot directly to Firebase Firestore
 */
export async function saveDatabaseToFirestoreNow(data: any): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    const targetDoc = doc(db, 'app_data', 'indoor_media_db');
    const sanitized = JSON.parse(JSON.stringify(data));
    const now = new Date().toISOString();

    await setDoc(targetDoc, {
      version: 1,
      updated_at: now,
      stats: {
        companies: sanitized.companies?.length || 0,
        players: sanitized.players?.length || 0,
        users: sanitized.users?.length || 0,
        playlists: sanitized.playlists?.length || 0,
        media: sanitized.media?.length || 0,
      },
      data: JSON.stringify(sanitized),
    });

    lastSyncTimestamp = now;
    lastSyncError = null;
    console.log(`[Firebase Firestore] Database synced successfully at ${now}`);
    return true;
  } catch (err: any) {
    console.error('[Firebase Firestore] Failed to save database to Firestore:', err?.message || err);
    lastSyncError = err?.message || 'Failed to save to Firestore';
    return false;
  }
}

/**
 * Queue debounced background sync to Firestore
 */
export function queueFirestoreSync(data: any) {
  pendingDataToSync = data;

  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }

  syncDebounceTimer = setTimeout(async () => {
    if (isSyncing || !pendingDataToSync) return;

    isSyncing = true;
    const toSave = pendingDataToSync;
    pendingDataToSync = null;

    try {
      await saveDatabaseToFirestoreNow(toSave);
    } finally {
      isSyncing = false;
      // If new data arrived while saving, trigger another sync
      if (pendingDataToSync) {
        queueFirestoreSync(pendingDataToSync);
      }
    }
  }, 1000); // Debounce by 1 second to batch rapid writes
}

export function getFirestoreSyncStatus() {
  const isConfigured = !!getFirestoreDb();
  return {
    configured: isConfigured,
    provider: 'Firebase Firestore',
    lastSyncTimestamp,
    lastSyncError,
    isSyncing,
  };
}
