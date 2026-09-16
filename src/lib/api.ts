import { Role, User, Company, Plan, Player, Operator, Playlist, Media, RssFeed, RssPreset, RssArticle, CallPhrase, PlayerCall, AdminStats, CompanyStats, WeatherData, MediaIntegrityAuditReport } from '../types';

const TOKEN_KEY = 'indoor_media_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Ocorreu um erro ao processar a requisição.');
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: { email?: string; password?: string; playerCode?: string; playerToken?: string; token?: string }) =>
    request<{ token: string; user: User; company?: { id: string; name: string }; player?: Player }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getMe: () =>
    request<{ user: User; company?: { id: string; name: string }; player?: Player }>('/auth/me'),

  changePassword: (newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // Admin
  getAdminStats: () => request<AdminStats>('/admin/stats'),
  getFirestoreStatus: () =>
    request<{
      configured: boolean;
      provider: string;
      lastSyncTimestamp: string | null;
      lastSyncError: string | null;
      isSyncing: boolean;
    }>('/admin/firestore/status'),
  syncFirestore: () =>
    request<{
      success: boolean;
      status: {
        configured: boolean;
        provider: string;
        lastSyncTimestamp: string | null;
        lastSyncError: string | null;
        isSyncing: boolean;
      };
    }>('/admin/firestore/sync', { method: 'POST' }),
  exportBackup: () => {
    window.location.href = '/api/admin/backup/export';
  },
  importBackup: (backup: any) =>
    request<{ success: boolean; message: string }>('/admin/backup/import', {
      method: 'POST',
      body: JSON.stringify({ backup }),
    }),
  getCompanies: () => request<Company[]>('/admin/companies'),
  createCompany: (data: Partial<Company> & { password?: string }) =>
    request<Company>('/admin/companies', { method: 'POST', body: JSON.stringify(data) }),
  updateCompany: (id: string, data: Partial<Company>) =>
    request<Company>(`/admin/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleCompanyStatus: (id: string) =>
    request<{ message: string; status: 'active' | 'inactive' }>(`/admin/companies/${id}/toggle-status`, {
      method: 'POST',
    }),
  resetCompanyPassword: (id: string, newPassword?: string) =>
    request<{ message: string }>(`/admin/companies/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),
  deleteCompany: (id: string) =>
    request<{ message: string }>(`/admin/companies/${id}`, { method: 'DELETE' }),

  getPlans: () => request<Plan[]>('/admin/plans'),
  createPlan: (data: Partial<Plan>) =>
    request<Plan>('/admin/plans', { method: 'POST', body: JSON.stringify(data) }),
  updatePlan: (id: string, data: Partial<Plan>) =>
    request<Plan>(`/admin/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  togglePlanStatus: (id: string) =>
    request<{ message: string; active: boolean }>(`/admin/plans/${id}/toggle-status`, { method: 'POST' }),
  deletePlan: (id: string) =>
    request<{ message: string }>(`/admin/plans/${id}`, { method: 'DELETE' }),

  seedDemoData: () =>
    request<{
      message: string;
      companiesCount: number;
      operatorsCount: number;
      playersCount: number;
      demoClients: Array<{
        id: string;
        name: string;
        segment: string;
        companyEmail: string;
        operatorEmail: string;
        playerCode: string;
        playerCodeSecondary?: string;
      }>;
    }>('/auth/seed-demo-data', { method: 'POST' }),

  // Company
  getCompanyStats: () => request<CompanyStats>('/company/stats'),

  getCompanyPlayers: () => request<Player[]>('/company/players'),
  createCompanyPlayer: (data: Partial<Player> & { password?: string }) =>
    request<Player>('/company/players', { method: 'POST', body: JSON.stringify(data) }),
  updateCompanyPlayer: (id: string, data: Partial<Player>) =>
    request<Player>(`/company/players/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  togglePlayerStatus: (id: string) =>
    request<{ message: string; status: 'active' | 'inactive' }>(`/company/players/${id}/toggle-status`, {
      method: 'POST',
    }),
  resetPlayerPassword: (id: string, newPassword?: string) =>
    request<{ message: string }>(`/company/players/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),
  deleteCompanyPlayer: (id: string) =>
    request<{ message: string }>(`/company/players/${id}`, { method: 'DELETE' }),
  regeneratePlayerToken: (id: string) =>
    request<{ message: string; access_token: string; player: Player }>(`/company/players/${id}/regenerate-token`, {
      method: 'POST',
    }),

  getCompanyOperators: () => request<Operator[]>('/company/operators'),
  createCompanyOperator: (data: Partial<Operator> & { password?: string }) =>
    request<Operator>('/company/operators', { method: 'POST', body: JSON.stringify(data) }),
  updateCompanyOperator: (id: string, data: Partial<Operator>) =>
    request<Operator>(`/company/operators/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleOperatorStatus: (id: string) =>
    request<{ message: string; active: boolean }>(`/company/operators/${id}/toggle-status`, { method: 'POST' }),
  resetOperatorPassword: (id: string, newPassword?: string) =>
    request<{ message: string }>(`/company/operators/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),
  deleteCompanyOperator: (id: string) =>
    request<{ message: string }>(`/company/operators/${id}`, { method: 'DELETE' }),

  getCompanyPlaylists: () => request<Playlist[]>('/company/playlists'),
  createCompanyPlaylist: (data: Partial<Playlist>) =>
    request<Playlist>('/company/playlists', { method: 'POST', body: JSON.stringify(data) }),
  updateCompanyPlaylist: (id: string, data: Partial<Playlist>) =>
    request<Playlist>(`/company/playlists/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  togglePlaylistStatus: (id: string) =>
    request<{ message: string; active: boolean }>(`/company/playlists/${id}/toggle-status`, { method: 'POST' }),
  deleteCompanyPlaylist: (id: string) =>
    request<{ message: string }>(`/company/playlists/${id}`, { method: 'DELETE' }),

  getCompanyMedia: () => request<Media[]>('/company/media'),
  checkMediaIntegrity: (driveAccessToken?: string) =>
    request<MediaIntegrityAuditReport>('/company/media/check-integrity', {
      method: 'POST',
      body: JSON.stringify({ driveAccessToken }),
    }),
  getMediaIntegrityStatus: () => request<MediaIntegrityAuditReport>('/company/media/integrity-status'),
  checkAdminMediaIntegrity: (params?: { companyId?: string; driveAccessToken?: string }) =>
    request<MediaIntegrityAuditReport>('/admin/media/check-integrity', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    }),
  getAdminMediaIntegrityStatus: (companyId?: string) =>
    request<MediaIntegrityAuditReport>(`/admin/media/integrity-status${companyId ? `?companyId=${companyId}` : ''}`),
  uploadFile: (fileData: string, filename: string, mimeType?: string) =>
    request<{ url: string; filename: string; originalName: string; size: number; mimeType: string }>('/upload', {
      method: 'POST',
      body: JSON.stringify({ fileData, filename, mimeType }),
    }),
  uploadCompanyMedia: (data: Partial<Media>) =>
    request<Media>('/company/media', { method: 'POST', body: JSON.stringify(data) }),
  deleteCompanyMedia: (id: string) =>
    request<{ message: string }>(`/company/media/${id}`, { method: 'DELETE' }),

  getCompanyRss: () => request<RssFeed[]>('/company/rss'),
  getRssPresets: () => request<RssPreset[]>('/company/rss/presets'),
  loadDefaultRssFeeds: () =>
    request<{ message: string; feeds: RssFeed[] }>('/company/rss/load-defaults', { method: 'POST' }),
  createCompanyRss: (data: Partial<RssFeed>) =>
    request<RssFeed>('/company/rss', { method: 'POST', body: JSON.stringify(data) }),
  updateCompanyRss: (id: string, data: Partial<RssFeed>) =>
    request<RssFeed>(`/company/rss/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleRssStatus: (id: string) =>
    request<{ message: string; active: boolean }>(`/company/rss/${id}/toggle-status`, { method: 'POST' }),
  deleteCompanyRss: (id: string) =>
    request<{ message: string }>(`/company/rss/${id}`, { method: 'DELETE' }),

  fetchRssHeadlines: (url: string) =>
    request<{ items: string[] }>(`/rss/proxy?url=${encodeURIComponent(url)}`),

  fetchRssArticles: (url: string) =>
    request<{ items: string[]; articles: RssArticle[]; feedTitle?: string }>(
      `/rss/proxy?url=${encodeURIComponent(url)}`
    ),

  // Operator
  getOperatorDashboard: () =>
    request<{
      players: Array<
        Pick<Player, 'id' | 'name' | 'code' | 'location' | 'orientation'> & {
          is_online: boolean;
          last_seen: string;
          expected_interval_seconds?: number;
          heartbeat_timeout_seconds?: number;
        }
      >;
      phrases: CallPhrase[];
      expected_interval_seconds?: number;
      heartbeat_timeout_seconds?: number;
      server_time?: string;
    }>('/operator/dashboard'),
  getOperatorPhrases: () => request<CallPhrase[]>('/operator/phrases'),
  createOperatorPhrase: (phrase: string) =>
    request<CallPhrase>('/operator/phrases', { method: 'POST', body: JSON.stringify({ phrase }) }),
  updateOperatorPhrase: (id: string, data: { phrase?: string; active?: boolean }) =>
    request<CallPhrase>(`/operator/phrases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOperatorPhrase: (id: string) =>
    request<{ message: string }>(`/operator/phrases/${id}`, { method: 'DELETE' }),

  triggerCall: (data: {
    playerId: string;
    phrase: string;
    phraseId?: string;
    duration?: number;
    isPriority?: boolean;
    is_priority?: boolean;
  }) =>
    request<{ message: string; call: PlayerCall; delivered: boolean }>('/operator/call', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Weather with Forecast
  getWeather: (city?: string) =>
    request<{
      status: string;
      city: string;
      temp: number;
      apparentTemp?: number;
      humidity?: number;
      windSpeed?: number;
      weatherCode: number;
      text: string;
      forecast?: Array<{
        date: string;
        dayName: string;
        max: number;
        min: number;
        weatherCode: number;
        text: string;
        rainProb?: number;
      }>;
      isFallback?: boolean;
    }>(`/weather?city=${encodeURIComponent(city || 'São Paulo')}`),

  // Player
  getCurrentPlayer: (code?: string, token?: string) => {
    const params = new URLSearchParams();
    if (code) params.append('code', code);
    if (token) params.append('token', token);
    const qs = params.toString();
    return request<{
      player: Pick<Player, 'id' | 'name' | 'code' | 'access_token' | 'location' | 'orientation'>;
      company: { id: string; name: string };
      playlist: { id: string; name: string; weather_city?: string } | null;
      weatherCity?: string;
      items: Array<{
        id: string;
        media_id: string;
        position: number;
        duration: number;
        name: string;
        type: 'image' | 'video' | 'rss' | 'weather_clock';
        file_url: string;
      }>;
      rssFeeds: RssFeed[];
    }>(qs ? `/player/current?${qs}` : '/player/current');
  },

  sendHeartbeat: (playerId: string) =>
    request<{ status: string }>('/player/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    }),

  getActiveCall: (playerId?: string, code?: string, token?: string) => {
    const params = new URLSearchParams();
    if (playerId) params.append('playerId', playerId);
    if (code) params.append('code', code);
    if (token) params.append('token', token);
    return request<{ activeCall: PlayerCall | null }>(`/player/active-call?${params.toString()}`);
  },

  // Google Drive & SubClients
  getDriveSettings: () => request<{ status: string; settings: any }>('/drive/settings'),
  updateDriveSettings: (data: any) =>
    request<{ status: string; settings: any }>('/drive/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSubClients: (companyId?: string) => {
    const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
    return request<{ status: string; subClients: any[] }>(`/sub-clients${query}`);
  },

  getCompanySubClients: (companyId: string) =>
    request<{ status: string; subClients: any[] }>(`/companies/${companyId}/sub-clients`),

  createSubClient: (companyId: string, data: any) =>
    request<{ status: string; subClient: any }>(`/companies/${companyId}/sub-clients`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSubClient: (id: string, data: any) =>
    request<{ status: string; subClient: any }>(`/sub-clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteSubClient: (id: string) =>
    request<{ status: string; message: string }>(`/sub-clients/${id}`, {
      method: 'DELETE',
    }),

  getDriveDocuments: (params?: { companyId?: string; subClientId?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.companyId) q.append('companyId', params.companyId);
    if (params?.subClientId) q.append('subClientId', params.subClientId);
    if (params?.category) q.append('category', params.category);
    return request<{ status: string; documents: any[] }>(`/drive/documents?${q.toString()}`);
  },

  createDriveDocument: (data: any) =>
    request<{ status: string; document: any }>('/drive/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDriveDocument: (id: string, data: any) =>
    request<{ status: string; document: any }>(`/drive/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteDriveDocument: (id: string) =>
    request<{ status: string; message: string }>(`/drive/documents/${id}`, {
      method: 'DELETE',
    }),
};
