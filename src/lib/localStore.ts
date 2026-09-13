import { Company, Plan, Player, Operator, Playlist, Media, RssFeed, RssPreset, CallPhrase, PlayerCall, AdminStats, CompanyStats, WeatherData, User } from '../types';

const STORAGE_KEY = 'cast_storemidia_local_db_v1';
const BROADCAST_NAME = 'cast_storemidia_bus';

export const DEFAULT_PLANS: Plan[] = [
  {
    id: 'plan-call-basic',
    name: 'Call Básico',
    description: '1 tela com chamadas completas de atendimento e até 4 operadores autorizados (proporção 4:1).',
    max_players: 1,
    max_operators: 4,
    max_storage: 50,
    monthly_price: 49.0,
    active: true,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'plan-call-inter',
    name: 'Call Intermediário',
    description: '3 telas com chamadas no painel e até 12 operadores de guichê (proporção 4:1).',
    max_players: 3,
    max_operators: 12,
    max_storage: 150,
    monthly_price: 109.0,
    active: true,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'plan-call-pro',
    name: 'Call Pro',
    description: '6 telas com chamadas simultâneas e até 24 operadores de guichê (proporção 4:1).',
    max_players: 6,
    max_operators: 24,
    max_storage: 300,
    monthly_price: 229.0,
    active: true,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'plan-show-basic',
    name: 'Show Básico',
    description: 'Exibição de mídia indoor, propagandas, hora certa e notícias RSS em até 2 telas (sem operador).',
    max_players: 2,
    max_operators: 0,
    max_storage: 50,
    monthly_price: 29.0,
    active: true,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'plan-show-inter',
    name: 'Show Intermediário',
    description: 'Até 5 telas simultâneas com notícias e mídias institucionais personalizadas (sem operador).',
    max_players: 5,
    max_operators: 0,
    max_storage: 150,
    monthly_price: 89.0,
    active: true,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'plan-show-pro',
    name: 'Show Pro',
    description: 'Até 12 telas para redes e múltiplos pontos comerciais focados em publicidade e notícias (sem operador).',
    max_players: 12,
    max_operators: 0,
    max_storage: 500,
    monthly_price: 149.0,
    active: true,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-05T00:00:00.000Z',
  },
];

export interface LocalDatabaseSchema {
  users: Array<User & { password_hash?: string }>;
  companies: Company[];
  plans: Plan[];
  players: Player[];
  operators: Operator[];
  playlists: Playlist[];
  media: Media[];
  rss_feeds: RssFeed[];
  call_phrases: CallPhrase[];
  player_calls: PlayerCall[];
  sub_clients: any[];
  drive_documents: any[];
  drive_settings: any;
}

export function createInitialLocalData(): LocalDatabaseSchema {
  const now = new Date().toISOString();
  const companyId = 'comp-demo-1';

  const defaultMedia: Media[] = [
    {
      id: 'med-1',
      company_id: companyId,
      name: 'Ofertas da Semana - Até 40% OFF',
      type: 'image',
      file_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%231e3a8a"/></linearGradient></defs><rect width="1920" height="1080" fill="url(%23bg)"/><circle cx="1600" cy="250" r="380" fill="%232563eb" opacity="0.15"/><circle cx="200" cy="900" r="300" fill="%2338bdf8" opacity="0.1"/><rect x="120" y="100" width="220" height="48" rx="8" fill="%232563eb"/><text x="140" y="132" fill="%23ffffff" font-size="22" font-family="system-ui, sans-serif" font-weight="bold">CAST STOREMIDIA</text><text x="120" y="320" fill="%2338bdf8" font-size="38" font-family="system-ui, sans-serif" font-weight="bold" letter-spacing="4">SEMANA DE OFERTAS ESPECIAIS</text><text x="120" y="440" fill="%23ffffff" font-size="82" font-family="system-ui, sans-serif" font-weight="900">ATÉ 40% DE DESCONTO</text><text x="120" y="540" fill="%2394a3b8" font-size="34" font-family="system-ui, sans-serif">Em produtos selecionados, perfumaria e linha especial.</text><rect x="120" y="640" width="560" height="180" rx="16" fill="%231e293b" stroke="%23334155" stroke-width="2"/><text x="160" y="710" fill="%2338bdf8" font-size="26" font-family="system-ui, sans-serif" font-weight="bold">ATENDIMENTO PERSONALIZADO</text><text x="160" y="760" fill="%23cbd5e1" font-size="22" font-family="system-ui, sans-serif">Consulte nossos especialistas para as melhores recomendações.</text></svg>',
      duration: 10,
      active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'med-2',
      company_id: companyId,
      name: 'Horário de Atendimento e Delivery',
      type: 'image',
      file_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080"><defs><linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23091e3a"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><rect width="1920" height="1080" fill="url(%23bg2)"/><rect x="120" y="100" width="260" height="48" rx="8" fill="%2310b981"/><text x="140" y="132" fill="%23ffffff" font-size="22" font-family="system-ui, sans-serif" font-weight="bold">ATENDIMENTO EXPRESSO</text><text x="120" y="320" fill="%2334d399" font-size="38" font-family="system-ui, sans-serif" font-weight="bold">COMODIDADE E RAPIDEZ</text><text x="120" y="440" fill="%23ffffff" font-size="78" font-family="system-ui, sans-serif" font-weight="900">RECEBA SUAS COMPRAS ONDE ESTIVER</text><text x="120" y="540" fill="%2394a3b8" font-size="34" font-family="system-ui, sans-serif">Peça pelo WhatsApp oficial ou canal digital de atendimento.</text><g transform="translate(120, 650)"><rect width="450" height="140" rx="12" fill="%231e293b"/><text x="40" y="60" fill="%2338bdf8" font-size="22" font-family="system-ui, sans-serif">WHATSAPP OFICIAL</text><text x="40" y="105" fill="%23ffffff" font-size="32" font-family="system-ui, sans-serif" font-weight="bold">(11) 98765-0000</text></g></svg>',
      duration: 10,
      active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'med-weather-clock',
      company_id: companyId,
      name: 'Hora Certa & Previsão do Tempo',
      type: 'weather_clock',
      file_url: 'widget:weather_clock',
      duration: 12,
      active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'med-rss-saude',
      company_id: companyId,
      name: 'Notícias RSS - Saúde & Bem-Estar',
      type: 'rss',
      file_url: 'https://g1.globo.com/rss/g1/saude/',
      duration: 15,
      active: true,
      created_at: now,
      updated_at: now,
    },
  ];

  const defaultPlaylist: Playlist = {
    id: 'pl-demo-1',
    company_id: companyId,
    name: 'Programação Principal - TV Salão',
    description: 'Grade completa com promoções, notícias RSS, hora certa e clima.',
    weather_city: 'São Paulo',
    active: true,
    items: [
      { id: 'pli-1', playlist_id: 'pl-demo-1', media_id: 'med-1', position: 1, duration: 10, created_at: now },
      { id: 'pli-2', playlist_id: 'pl-demo-1', media_id: 'med-2', position: 2, duration: 10, created_at: now },
      { id: 'pli-3', playlist_id: 'pl-demo-1', media_id: 'med-weather-clock', position: 3, duration: 12, created_at: now },
      { id: 'pli-4', playlist_id: 'pl-demo-1', media_id: 'med-rss-saude', position: 4, duration: 15, created_at: now },
    ],
    created_at: now,
    updated_at: now,
  };

  const defaultPlayers: Player[] = [
    {
      id: 'play-1',
      company_id: companyId,
      user_id: 'usr-play-1',
      name: 'TV Salão Principal (Horizontal)',
      code: 'TV-1001',
      location: 'Recepção / Salão',
      description: 'Smart TV 55 polegadas na área de atendimento',
      orientation: 'horizontal',
      playlist_id: 'pl-demo-1',
      status: 'active',
      access_token: 'tok_demo_sala_1001',
      last_seen: now,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'play-2',
      company_id: companyId,
      user_id: 'usr-play-2',
      name: 'Totem Vertical - Entrada',
      code: 'TV-1002',
      location: 'Entrada da Loja',
      description: 'Totem 9:16 vertical interativo',
      orientation: 'vertical',
      playlist_id: 'pl-demo-1',
      status: 'active',
      access_token: 'tok_demo_sala_1002',
      last_seen: now,
      created_at: now,
      updated_at: now,
    },
  ];

  return {
    users: [
      {
        id: 'usr-admin-1',
        name: 'Administrador Geral',
        email: 'admin@cast.com',
        role: 'admin',
        company_id: null,
        must_change_password: false,
      },
      {
        id: 'usr-comp-1',
        name: 'Gerente Drogaria São Paulo',
        email: 'empresa@cast.com',
        role: 'company',
        company_id: companyId,
        must_change_password: false,
      },
      {
        id: 'usr-op-1',
        name: 'Carlos Atendimento',
        email: 'operador@cast.com',
        role: 'operator',
        company_id: companyId,
        must_change_password: false,
      },
    ],
    companies: [
      {
        id: companyId,
        legal_name: 'Drogaria São Paulo S/A',
        trade_name: 'Drogaria São Paulo - Matriz',
        cnpj: '61.412.110/0001-55',
        email: 'contato@drogariasp.com.br',
        phone: '(11) 3345-8000',
        responsible: 'Roberto Ferreira',
        address: 'Av. Paulista, 1000',
        city: 'São Paulo',
        state: 'SP',
        plan_id: 'plan-call-inter',
        start_date: '2026-01-01',
        due_date: '2027-01-01',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
    ],
    plans: DEFAULT_PLANS,
    players: defaultPlayers,
    operators: [
      {
        id: 'op-1',
        company_id: companyId,
        user_id: 'usr-op-1',
        name: 'Carlos Atendimento',
        email: 'operador@cast.com',
        phone: '(11) 98765-4321',
        active: true,
        created_at: now,
        updated_at: now,
      },
    ],
    playlists: [defaultPlaylist],
    media: defaultMedia,
    rss_feeds: [
      {
        id: 'rss-1',
        company_id: companyId,
        name: 'G1 - Saúde e Bem-Estar',
        url: 'https://g1.globo.com/rss/g1/saude/',
        active: true,
        created_at: now,
        updated_at: now,
      },
    ],
    call_phrases: [
      {
        id: 'phrase-1',
        company_id: companyId,
        operator_id: null,
        phrase: 'Senha Normal: 001 ao Guichê 01',
        active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'phrase-2',
        company_id: companyId,
        operator_id: null,
        phrase: 'Senha Preferencial: P-001 ao Atendimento 02',
        active: true,
        created_at: now,
        updated_at: now,
      },
    ],
    player_calls: [],
    sub_clients: [],
    drive_documents: [],
    drive_settings: {
      connected: false,
      root_folder_name: 'CAST STOREMIDIA - ARQUIVOS DO SISTEMA',
    },
  };
}

class LocalStore {
  private data: LocalDatabaseSchema;
  private channel: BroadcastChannel | null = null;

  constructor() {
    this.data = this.load();
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.channel = new BroadcastChannel(BROADCAST_NAME);
      }
    } catch {
      // Ignora se não houver suporte
    }
  }

  private load(): LocalDatabaseSchema {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.companies) && parsed.companies.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    const initial = createInitialLocalData();
    this.save(initial);
    return initial;
  }

  private save(data: LocalDatabaseSchema) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.data = data;
    } catch {
      // Storage quota
    }
  }

  public getData(): LocalDatabaseSchema {
    return this.data;
  }

  public broadcastCall(call: PlayerCall) {
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'CALL_EVENT', call });
      } catch {
        // Fallback
      }
    }
    // Suporte também ao canal legado e chave do localStorage do PlayerView
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const legacyBc = new BroadcastChannel('indoor_media_calls');
        legacyBc.postMessage({ type: 'CALL_EVENT', call });
        legacyBc.close();
      }
      localStorage.setItem('indoor_last_call', JSON.stringify({ call, timestamp: Date.now() }));
    } catch {
      // Ignora erro de storage
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cast_call_event', { detail: call }));
    }
  }

  public onCall(callback: (call: PlayerCall) => void): () => void {
    const handleBroadcast = (ev: MessageEvent) => {
      if (ev.data && ev.data.type === 'CALL_EVENT' && ev.data.call) {
        callback(ev.data.call);
      }
    };
    const handleCustom = (ev: Event) => {
      const custom = ev as CustomEvent<PlayerCall>;
      if (custom.detail) {
        callback(custom.detail);
      }
    };

    if (this.channel) {
      this.channel.addEventListener('message', handleBroadcast);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('cast_call_event', handleCustom);
    }

    return () => {
      if (this.channel) {
        this.channel.removeEventListener('message', handleBroadcast);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('cast_call_event', handleCustom);
      }
    };
  }

  public persist() {
    this.save(this.data);
  }
}

export const localStore = new LocalStore();
