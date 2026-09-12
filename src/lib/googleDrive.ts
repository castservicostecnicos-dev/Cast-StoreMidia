import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase safely (avoid re-initialization)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Google Drive scope for file & folder creation/management
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to track ongoing sign in flow
let isSigningIn = false;
// Strictly in-memory cache for OAuth access token as required by Google Workspace integration guidelines
let cachedAccessToken: string | null = null;

export interface DriveAccountInfo {
  email: string;
  name: string;
  photoUrl?: string;
  uid: string;
}

export interface DriveFolderResult {
  id: string;
  name: string;
  webViewLink?: string;
}

export interface DriveUploadResult {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  webContentLink?: string;
  size?: number;
}

export interface ClientHierarchyStructure {
  rootFolder: DriveFolderResult;
  clientFolder: DriveFolderResult;
  categoryFolders: {
    photos: DriveFolderResult;
    documents: DriveFolderResult;
  };
}

/**
 * Initialize Auth State Listener
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token expired or page reloaded, prompt user to connect via DEV
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign In with Google via Popup to choose Google Drive account
 */
export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google Drive.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro ao conectar Google Drive:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get current in-memory access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCachedToken = (): string | null => {
  return cachedAccessToken;
};

export const hasActiveSession = (): boolean => {
  return !!cachedAccessToken;
};

export const requestGoogleLogin = googleSignIn;

/**
 * Set in-memory access token manually (if retrieved during session)
 */
export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

/**
 * Disconnect Google Drive account
 */
export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// =========================================================================
// GOOGLE DRIVE API v3 HELPER FUNCTIONS
// =========================================================================

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3/files';

/**
 * Search for an existing folder or file by name and parent
 */
export const findDriveFolder = async (
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<DriveFolderResult | null> => {
  let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const url = `${DRIVE_API_BASE}?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)&pageSize=1`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Erro ao buscar pasta no Google Drive (${res.status})`
    );
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return {
      id: data.files[0].id,
      name: data.files[0].name,
      webViewLink: data.files[0].webViewLink,
    };
  }
  return null;
};

/**
 * Create a new folder on Google Drive
 */
export const createDriveFolder = async (
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<DriveFolderResult> => {
  const metadata: { name: string; mimeType: string; parents?: string[] } = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  const res = await fetch(`${DRIVE_API_BASE}?fields=id,name,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Erro ao criar pasta no Google Drive (${res.status})`
    );
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    webViewLink: data.webViewLink,
  };
};

/**
 * Get or Create a folder (avoids duplicates)
 */
export const getOrCreateDriveFolder = async (
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<DriveFolderResult> => {
  const existing = await findDriveFolder(accessToken, folderName, parentId);
  if (existing) {
    return existing;
  }
  return await createDriveFolder(accessToken, folderName, parentId);
};

/**
 * Automatically builds and ensures the folder hierarchy for a Client (Empresa):
 * 1. Root: [MÍDIA INDOOR - ARQUIVOS DO SISTEMA]
 * 2. Pasta do Cliente: {clientName}
 * 3. Subpastas separadoras por categoria:
 *    - 📸 Fotos com Código Único
 *    - 📄 Documentos e Arquivos
 */
export const ensureClientFolders = async (
  accessToken: string,
  clientName: string,
  customRootName: string = 'MÍDIA INDOOR - ARQUIVOS DO SISTEMA'
): Promise<ClientHierarchyStructure> => {
  // 1. Root folder
  const rootFolder = await getOrCreateDriveFolder(accessToken, customRootName);

  // 2. Pasta direta do Cliente (Empresa)
  const cleanName = (clientName || 'Cliente').trim();
  const clientFolder = await getOrCreateDriveFolder(
    accessToken,
    cleanName,
    rootFolder.id
  );

  // 3. Pastas separadoras por categoria dentro da pasta do cliente
  const [photosFolder, documentsFolder] = await Promise.all([
    getOrCreateDriveFolder(
      accessToken,
      '📸 Fotos com Código Único',
      clientFolder.id
    ),
    getOrCreateDriveFolder(
      accessToken,
      '📄 Documentos e Arquivos',
      clientFolder.id
    ),
  ]);

  return {
    rootFolder,
    clientFolder,
    categoryFolders: {
      photos: photosFolder,
      documents: documentsFolder,
    },
  };
};

export const ensureClientHierarchy = async (
  accessToken: string,
  companyName: string,
  _ignoredSubClientName?: string,
  customRootName?: string
): Promise<ClientHierarchyStructure> => {
  return ensureClientFolders(accessToken, companyName, customRootName);
};

/**
 * Upload a file directly to Google Drive into a designated folder with custom metadata
 */
export const uploadFileToDrive = async (
  accessToken: string,
  file: File | Blob,
  fileName: string,
  folderId: string,
  options?: {
    description?: string;
    uniqueCode?: string;
  }
): Promise<DriveUploadResult> => {
  const metadata = {
    name: fileName,
    parents: [folderId],
    description: options?.description || `Código Único: ${options?.uniqueCode || 'N/A'}`,
  };

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  formData.append('file', file);

  const url = `${DRIVE_UPLOAD_BASE}?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,size`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Erro ao enviar arquivo para o Google Drive (${res.status})`
    );
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    mimeType: data.mimeType,
    webViewLink: data.webViewLink,
    webContentLink: data.webContentLink,
    size: data.size ? Number(data.size) : undefined,
  };
};

/**
 * List files inside a specific Google Drive folder
 */
export const listDriveFolderFiles = async (
  accessToken: string,
  folderId: string
): Promise<any[]> => {
  const query = `'${folderId}' in parents and trashed=false`;
  const url = `${DRIVE_API_BASE}?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,mimeType,webViewLink,webContentLink,thumbnailLink,size,createdTime,description)&pageSize=100`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Erro ao listar arquivos do Google Drive (${res.status})`
    );
  }

  const data = await res.json();
  return data.files || [];
};

/**
 * Delete a file from Google Drive (Mandatory user confirmation handled by caller or dialog)
 */
export const deleteDriveFile = async (
  accessToken: string,
  fileId: string
): Promise<boolean> => {
  const url = `${DRIVE_API_BASE}/${fileId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Erro ao excluir arquivo do Google Drive (${res.status})`
    );
  }

  return true;
};
