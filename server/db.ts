import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  salt: string;
  role: 'admin' | 'company' | 'operator' | 'player';
  company_id: string | null;
  active: boolean;
  must_change_password?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  legal_name: string;
  trade_name: string;
  cnpj: string;
  email: string;
  phone: string;
  responsible: string;
  address: string;
  city: string;
  state: string;
  plan_id: string;
  start_date: string;
  due_date: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  drive_folder_id?: string;
  drive_folder_url?: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  max_players: number;
  max_operators: number;
  max_storage: number;
  monthly_price: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  code: string;
  location: string;
  description: string;
  orientation: 'horizontal' | 'vertical'; // 'horizontal' (16:9 - 1920x1080) | 'vertical' (9:16 - 1080x1920)
  playlist_id: string | null;
  status: 'active' | 'inactive';
  access_token?: string;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface Operator {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  media_id: string;
  position: number;
  duration: number; // in seconds
  created_at: string;
}

export interface Playlist {
  id: string;
  company_id: string;
  name: string;
  description: string;
  weather_city?: string;
  active: boolean;
  items: PlaylistItem[];
  created_at: string;
  updated_at: string;
}

export interface Media {
  id: string;
  company_id: string;
  name: string;
  type: 'image' | 'video' | 'rss' | 'weather_clock';
  file_url: string;
  duration: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RssFeed {
  id: string;
  company_id: string;
  name: string;
  url: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RssPreset {
  name: string;
  url: string;
  description: string;
  category: string;
}

export const DEFAULT_RSS_FEEDS: RssPreset[] = [
  {
    name: 'G1 - Saúde e Bem-Estar',
    url: 'https://g1.globo.com/rss/g1/saude/',
    description: 'Prevenção, qualidade de vida, alimentação saudável e avanços médicos.',
    category: 'Saúde',
  },
  {
    name: 'G1 - Brasil e Notícias Gerais',
    url: 'https://g1.globo.com/rss/g1/brasil/',
    description: 'Principais manchetes e acontecimentos de destaque nacional em tempo real.',
    category: 'Geral',
  },
  {
    name: 'Folha de S.Paulo - Em Cima da Hora',
    url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml',
    description: 'Atualizações minuto a minuto dos principais fatos do Brasil e do mundo.',
    category: 'Jornalismo',
  },
  {
    name: 'G1 - Economia e Negócios',
    url: 'https://g1.globo.com/rss/g1/economia/',
    description: 'Mercado de trabalho, finanças, inflação e tendências de negócios.',
    category: 'Economia',
  },
  {
    name: 'G1 - Tecnologia e Inovação',
    url: 'https://g1.globo.com/rss/g1/tecnologia/',
    description: 'Novidades do universo tech, internet, celulares e inteligência artificial.',
    category: 'Tecnologia',
  },
];

export function seedDefaultRssFeedsForCompany(
  companyId: string,
  data: DatabaseSchema,
  now: string = new Date().toISOString()
): void {
  DEFAULT_RSS_FEEDS.forEach((feed, idx) => {
    const alreadyExists = data.rss_feeds.some(
      (r) =>
        r.company_id === companyId &&
        (r.url.trim() === feed.url.trim() || r.name.toLowerCase() === feed.name.toLowerCase())
    );
    if (!alreadyExists) {
      data.rss_feeds.push({
        id: `rss-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        company_id: companyId,
        name: feed.name,
        url: feed.url,
        active: true,
        created_at: now,
        updated_at: now,
      });
    }
  });

  // Ensure default Full-Screen RSS Media item exists
  const hasRssMedia = data.media.some((m) => m.company_id === companyId && m.type === 'rss');
  if (!hasRssMedia) {
    const rssMediaId = `med-${Date.now()}-rss-saude`;
    data.media.push({
      id: rssMediaId,
      company_id: companyId,
      name: 'Notícias RSS - Saúde & Bem-Estar',
      type: 'rss',
      file_url: 'https://g1.globo.com/rss/g1/saude/',
      duration: 15,
      active: true,
      created_at: now,
      updated_at: now,
    });

    const pl = data.playlists?.find((p) => p.company_id === companyId);
    if (pl && !pl.items.some((it) => it.media_id === rssMediaId)) {
      pl.items.push({
        id: `pli-${Date.now()}-rss`,
        playlist_id: pl.id,
        media_id: rssMediaId,
        position: pl.items.length + 1,
        duration: 15,
        created_at: now,
      });
    }
  }
}

export interface CallPhrase {
  id: string;
  company_id: string;
  operator_id: string | null;
  phrase: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlayerCall {
  id: string;
  company_id: string;
  player_id: string;
  operator_id: string;
  phrase_id: string | null;
  phrase: string;
  duration: number;
  is_priority?: boolean;
  created_at: string;
}

export interface SubClient {
  id: string;
  company_id: string;
  name: string;
  code: string;
  phone?: string;
  email?: string;
  notes?: string;
  drive_folder_id?: string;
  drive_folder_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DriveDocument {
  id: string;
  unique_code: string; // Ex: FOTO-CLI-001-3F8E, DOC-CLI-001-9X72
  company_id: string;
  sub_client_id?: string;
  category: 'photo' | 'document';
  title: string;
  description: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  drive_file_id?: string;
  drive_folder_id?: string;
  drive_view_url?: string;
  drive_download_url?: string;
  local_url?: string;
  status: 'draft' | 'approved' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface DriveSettings {
  connected: boolean;
  account_email?: string;
  account_name?: string;
  account_photo?: string;
  root_folder_id?: string;
  root_folder_name?: string;
  root_folder_url?: string;
  last_synced_at?: string;
}

export interface DatabaseSchema {
  users: User[];
  companies: Company[];
  plans: Plan[];
  players: Player[];
  operators: Operator[];
  playlists: Playlist[];
  media: Media[];
  rss_feeds: RssFeed[];
  call_phrases: CallPhrase[];
  player_calls: PlayerCall[];
  sub_clients: SubClient[];
  drive_documents: DriveDocument[];
  drive_settings: DriveSettings;
}

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

export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
}

const dataDir = path.resolve(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'indoor_media.json');

class DatabaseStore {
  private data: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(dbPath)) {
      try {
        const raw = fs.readFileSync(dbPath, 'utf-8');
        this.data = JSON.parse(raw);
        // Normalize player orientation
        let changed = false;
        if (this.data.players) {
          for (const p of this.data.players) {
            if (!p.orientation) {
              p.orientation = p.code?.includes('SALA') ? 'vertical' : 'horizontal';
              changed = true;
            }
          }
        }

        // Ensure weather_clock media item exists
        if (this.data.media) {
          const hasWeatherMedia = this.data.media.some((m) => m.type === 'weather_clock');
          if (!hasWeatherMedia && this.data.companies && this.data.companies.length > 0) {
            const cId = this.data.companies[0].id;
            const now = new Date().toISOString();
            const weatherMedia: Media = {
              id: 'med-weather-clock',
              company_id: cId,
              name: 'Hora Certa & Previsão do Tempo',
              type: 'weather_clock',
              file_url: 'widget:weather_clock',
              duration: 12,
              active: true,
              created_at: now,
              updated_at: now,
            };
            this.data.media.push(weatherMedia);
            changed = true;

            const pl = this.data.playlists?.find((p) => p.company_id === cId);
            if (pl && !pl.items.some((it) => it.media_id === 'med-weather-clock')) {
              pl.items.push({
                id: `pli-${Date.now()}-weather`,
                playlist_id: pl.id,
                media_id: 'med-weather-clock',
                position: pl.items.length + 1,
                duration: 12,
                created_at: now,
              });
              changed = true;
            }
          }
        }

        // Clear any old predefined call phrases as requested
        if (this.data.call_phrases && this.data.call_phrases.length > 0) {
          this.data.call_phrases = [];
          changed = true;
        }

        // Ensure every company has default RSS feeds loaded
        if (this.data.companies && this.data.rss_feeds) {
          const now = new Date().toISOString();
          for (const comp of this.data.companies) {
            const currentCount = this.data.rss_feeds.filter((r) => r.company_id === comp.id).length;
            if (currentCount < DEFAULT_RSS_FEEDS.length) {
              seedDefaultRssFeedsForCompany(comp.id, this.data, now);
              changed = true;
            }
          }
        }

        // Synchronize the 6 official plans: Call Básico, Call Intermediário, Call Pro, Show Básico, Show Intermediário, Show Pro
        if (this.data.plans) {
          const legacyIds = new Set(['plan-basic', 'plan-pro', 'plan-enterprise']);
          const initialLength = this.data.plans.length;
          this.data.plans = this.data.plans.filter((p) => !legacyIds.has(p.id));
          if (this.data.plans.length !== initialLength) {
            changed = true;
          }

          for (const defPlan of DEFAULT_PLANS) {
            const existingIdx = this.data.plans.findIndex(
              (p) => p.id === defPlan.id || p.name.trim().toLowerCase() === defPlan.name.trim().toLowerCase()
            );
            if (existingIdx === -1) {
              this.data.plans.push({ ...defPlan });
              changed = true;
            } else {
              // Update plan limits and price to match requested specifications
              this.data.plans[existingIdx].id = defPlan.id;
              this.data.plans[existingIdx].name = defPlan.name;
              this.data.plans[existingIdx].description = defPlan.description;
              this.data.plans[existingIdx].max_players = defPlan.max_players;
              this.data.plans[existingIdx].max_operators = defPlan.max_operators;
              this.data.plans[existingIdx].max_storage = defPlan.max_storage;
              this.data.plans[existingIdx].monthly_price = defPlan.monthly_price;
              this.data.plans[existingIdx].active = true;
              changed = true;
            }
          }

          // Remap any legacy plan IDs or ensure demo company with operators is on Call Intermediário
          if (this.data.companies) {
            for (const comp of this.data.companies) {
              const opCount = (this.data.operators || []).filter((o) => o.company_id === comp.id).length;
              if (comp.id === 'comp-demo-1' && opCount > 0 && comp.plan_id === 'plan-show-inter') {
                comp.plan_id = 'plan-call-inter';
                changed = true;
              } else if (!this.data.plans.some((p) => p.id === comp.plan_id) || comp.plan_id === 'plan-pro' || comp.plan_id === 'plan-basic' || comp.plan_id === 'plan-enterprise') {
                comp.plan_id = 'plan-call-inter';
                changed = true;
              }
            }
          }
        }

        // Ensure sub_clients, drive_documents, and drive_settings exist
        if (!this.data.sub_clients) {
          this.data.sub_clients = [];
          changed = true;
        }
        if (!this.data.drive_documents) {
          this.data.drive_documents = [];
          changed = true;
        }
        if (!this.data.drive_settings) {
          this.data.drive_settings = {
            connected: false,
            root_folder_name: 'MÍDIA INDOOR - ARQUIVOS DO SISTEMA',
          };
          changed = true;
        }

        // Ensure all players have a unique persistent access_token for direct URL auto-start
        if (this.data.players && Array.isArray(this.data.players)) {
          for (const pl of this.data.players) {
            if (!pl.access_token) {
              pl.access_token = `tok_${crypto.randomBytes(16).toString('hex')}`;
              changed = true;
            }
          }
        }

        if (changed) {
          this.save();
        }
      } catch {
        this.data = this.createInitialData();
        this.save();
      }
    } else {
      this.data = this.createInitialData();
      this.save();
    }
  }

  private save() {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving db file:', err);
    }
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  public persist() {
    this.save();
  }

  private createInitialData(): DatabaseSchema {
    const now = new Date().toISOString();
    const adminPass = hashPassword(process.env.ADMIN_INITIAL_PASSWORD || 'Admin@123456');
    const demoPass = hashPassword('123456');

    const adminUser: User = {
      id: 'usr-admin-1',
      name: 'Administrador Geral',
      email: 'ale11062@gmail.com',
      password_hash: adminPass.hash,
      salt: adminPass.salt,
      role: 'admin',
      company_id: null,
      active: true,
      must_change_password: true,
      created_at: now,
      updated_at: now,
    };

    const plans: Plan[] = DEFAULT_PLANS.map((p) => ({
      ...p,
      created_at: now,
      updated_at: now,
    }));

    const companyId = 'comp-demo-1';
    const companyUser: User = {
      id: 'usr-comp-1',
      name: 'Gerente Drogaria São Paulo',
      email: 'empresa@drogariasp.com.br',
      password_hash: demoPass.hash,
      salt: demoPass.salt,
      role: 'company',
      company_id: companyId,
      active: true,
      must_change_password: false,
      created_at: now,
      updated_at: now,
    };

    const company: Company = {
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
    };

    const operatorUser: User = {
      id: 'usr-op-1',
      name: 'Carlos Atendimento',
      email: 'operador@drogariasp.com.br',
      password_hash: demoPass.hash,
      salt: demoPass.salt,
      role: 'operator',
      company_id: companyId,
      active: true,
      must_change_password: false,
      created_at: now,
      updated_at: now,
    };

    const operator: Operator = {
      id: 'op-1',
      company_id: companyId,
      user_id: operatorUser.id,
      name: 'Carlos Atendimento',
      email: 'operador@drogariasp.com.br',
      phone: '(11) 98765-4321',
      active: true,
      created_at: now,
      updated_at: now,
    };

    const playerUser1: User = {
      id: 'usr-play-1',
      name: 'Player Recepção',
      email: 'player1@drogariasp.com.br',
      password_hash: demoPass.hash,
      salt: demoPass.salt,
      role: 'player',
      company_id: companyId,
      active: true,
      must_change_password: false,
      created_at: now,
      updated_at: now,
    };

    const playerUser2: User = {
      id: 'usr-play-2',
      name: 'Player Caixa 02',
      email: 'player2@drogariasp.com.br',
      password_hash: demoPass.hash,
      salt: demoPass.salt,
      role: 'player',
      company_id: companyId,
      active: true,
      must_change_password: false,
      created_at: now,
      updated_at: now,
    };

    const mediaList: Media[] = [
      {
        id: 'med-1',
        company_id: companyId,
        name: 'Ofertas da Semana - Até 40% OFF',
        type: 'image',
        file_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%231e3a8a"/></linearGradient></defs><rect width="1920" height="1080" fill="url(%23bg)"/><circle cx="1600" cy="250" r="380" fill="%232563eb" opacity="0.15"/><circle cx="200" cy="900" r="300" fill="%2338bdf8" opacity="0.1"/><rect x="120" y="100" width="220" height="48" rx="8" fill="%232563eb"/><text x="140" y="132" fill="%23ffffff" font-size="22" font-family="system-ui, sans-serif" font-weight="bold">DROGARIA SÃO PAULO</text><text x="120" y="320" fill="%2338bdf8" font-size="38" font-family="system-ui, sans-serif" font-weight="bold" letter-spacing="4">SEMANA DA SAÚDE E BEM-ESTAR</text><text x="120" y="440" fill="%23ffffff" font-size="82" font-family="system-ui, sans-serif" font-weight="900">ATÉ 40% DE DESCONTO</text><text x="120" y="540" fill="%2394a3b8" font-size="34" font-family="system-ui, sans-serif">Em medicamentos selecionados, dermocosméticos e vitaminas.</text><rect x="120" y="640" width="560" height="180" rx="16" fill="%231e293b" stroke="%23334155" stroke-width="2"/><text x="160" y="710" fill="%2338bdf8" font-size="26" font-family="system-ui, sans-serif" font-weight="bold">CONSULTE NOSSO FARMACÊUTICO</text><text x="160" y="760" fill="%23cbd5e1" font-size="22" font-family="system-ui, sans-serif">Aferição de pressão e testes rápidos disponíveis no guichê 2.</text></svg>',
        duration: 8,
        active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'med-2',
        company_id: companyId,
        name: 'Horário de Atendimento e Delivery',
        type: 'image',
        file_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080"><defs><linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23091e3a"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><rect width="1920" height="1080" fill="url(%23bg2)"/><rect x="120" y="100" width="220" height="48" rx="8" fill="%2310b981"/><text x="140" y="132" fill="%23ffffff" font-size="22" font-family="system-ui, sans-serif" font-weight="bold">ATENDIMENTO 24 HORAS</text><text x="120" y="320" fill="%2334d399" font-size="38" font-family="system-ui, sans-serif" font-weight="bold">COMODIDADE PARA VOCÊ</text><text x="120" y="440" fill="%23ffffff" font-size="78" font-family="system-ui, sans-serif" font-weight="900">RECEBA SEUS MEDICAMENTOS EM CASA</text><text x="120" y="540" fill="%2394a3b8" font-size="34" font-family="system-ui, sans-serif">Peça pelo WhatsApp oficial ou aplicativo com entrega expressa em até 45 minutos.</text><g transform="translate(120, 650)"><rect width="450" height="140" rx="12" fill="%231e293b"/><text x="40" y="60" fill="%2338bdf8" font-size="22" font-family="system-ui, sans-serif">WHATSAPP OFICIAL</text><text x="40" y="105" fill="%23ffffff" font-size="32" font-family="system-ui, sans-serif" font-weight="bold">(11) 98765-0000</text></g></svg>',
        duration: 8,
        active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'med-3',
        company_id: companyId,
        name: 'Dica de Saúde - Hidratação Diária',
        type: 'image',
        file_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080"><defs><linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23172554"/><stop offset="100%" stop-color="%231e293b"/></linearGradient></defs><rect width="1920" height="1080" fill="url(%23bg3)"/><rect x="120" y="100" width="180" height="48" rx="8" fill="%230284c7"/><text x="140" y="132" fill="%23ffffff" font-size="22" font-family="system-ui, sans-serif" font-weight="bold">DICA DE SAÚDE</text><text x="120" y="320" fill="%2338bdf8" font-size="36" font-family="system-ui, sans-serif" font-weight="bold">CUIDE DO SEU CORPO</text><text x="120" y="440" fill="%23ffffff" font-size="80" font-family="system-ui, sans-serif" font-weight="900">VOCÊ JÁ BEBEU ÁGUA HOJE?</text><text x="120" y="540" fill="%2394a3b8" font-size="34" font-family="system-ui, sans-serif">A hidratação regular melhora a disposição, circulação e o funcionamento renal.</text><rect x="120" y="650" width="700" height="140" rx="14" fill="%230f172a" stroke="%23334155" stroke-width="2"/><text x="160" y="715" fill="%2338bdf8" font-size="24" font-family="system-ui, sans-serif" font-weight="bold">RECOMENDAÇÃO MÉDICA</text><text x="160" y="755" fill="%23e2e8f0" font-size="20" font-family="system-ui, sans-serif">Consuma no mínimo 2 litros de água filtrada ao longo do dia.</text></svg>',
        duration: 8,
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
      }
    ];

    const playlistId = 'pl-1';
    const playlist: Playlist = {
      id: playlistId,
      company_id: companyId,
      name: 'Programação Recepção Geral',
      description: 'Loop institucional com promoções, dicas de saúde, clima/hora e notícias em tempo real.',
      weather_city: 'São Paulo',
      active: true,
      items: [
        {
          id: 'pli-1',
          playlist_id: playlistId,
          media_id: 'med-1',
          position: 1,
          duration: 8,
          created_at: now,
        },
        {
          id: 'pli-2',
          playlist_id: playlistId,
          media_id: 'med-2',
          position: 2,
          duration: 8,
          created_at: now,
        },
        {
          id: 'pli-3',
          playlist_id: playlistId,
          media_id: 'med-3',
          position: 3,
          duration: 8,
          created_at: now,
        },
        {
          id: 'pli-4',
          playlist_id: playlistId,
          media_id: 'med-weather-clock',
          position: 4,
          duration: 12,
          created_at: now,
        },
        {
          id: 'pli-5',
          playlist_id: playlistId,
          media_id: 'med-rss-saude',
          position: 5,
          duration: 15,
          created_at: now,
        }
      ],
      created_at: now,
      updated_at: now,
    };

    const players: Player[] = [
      {
        id: 'play-1',
        company_id: companyId,
        user_id: playerUser1.id,
        name: 'PLAYER RECEPÇÃO',
        code: 'PLAY-REC-01',
        location: 'Hall de Entrada Principal',
        description: 'Smart TV 55 polegadas na recepção principal.',
        orientation: 'horizontal',
        playlist_id: playlistId,
        status: 'active',
        access_token: 'tok_play_rec_01_a9f8b2c4',
        last_seen: new Date().toISOString(), // Online
        created_at: now,
        updated_at: now,
      },
      {
        id: 'play-2',
        company_id: companyId,
        user_id: playerUser2.id,
        name: 'PLAYER SALA 02 (TOTEM)',
        code: 'PLAY-SALA-02',
        location: 'Sala de Espera 02',
        description: 'Totem digital vertical 9:16 na sala de espera.',
        orientation: 'vertical',
        playlist_id: playlistId,
        status: 'active',
        access_token: 'tok_play_sala_02_e7d1c3b5',
        last_seen: new Date(Date.now() - 3600000).toISOString(), // Offline (1h ago)
        created_at: now,
        updated_at: now,
      }
    ];

    const callPhrases: CallPhrase[] = [];

    const rssFeeds: RssFeed[] = DEFAULT_RSS_FEEDS.map((feed, idx) => ({
      id: `rss-${idx + 1}`,
      company_id: companyId,
      name: feed.name,
      url: feed.url,
      active: true,
      created_at: now,
      updated_at: now,
    }));

    return {
      users: [adminUser, companyUser, operatorUser, playerUser1, playerUser2],
      companies: [company],
      plans,
      players,
      operators: [operator],
      playlists: [playlist],
      media: mediaList,
      rss_feeds: rssFeeds,
      call_phrases: callPhrases,
      player_calls: [],
      sub_clients: [
        {
          id: 'sub-cli-1',
          company_id: companyId,
          name: 'Dr. Roberto Rocha (Consultório 02)',
          code: 'CLI-001',
          phone: '(11) 98111-2233',
          email: 'roberto@clinicaexemplo.com.br',
          notes: 'Cliente atendido frequentemente para serviços de saúde.',
          created_at: now,
          updated_at: now,
        },
        {
          id: 'sub-cli-2',
          company_id: companyId,
          name: 'Farmácia Central Distribuidora',
          code: 'CLI-002',
          phone: '(11) 98222-3344',
          email: 'central@farmaciaexemplo.com.br',
          notes: 'Cliente comercial para orçamentos e pedidos de mídias.',
          created_at: now,
          updated_at: now,
        },
      ],
      drive_documents: [],
      drive_settings: {
        connected: false,
        root_folder_name: 'MÍDIA INDOOR - ARQUIVOS DO SISTEMA',
      },
    };
  }

  // ==========================================
  // SUB-CLIENTS (CLIENTES DO CLIENTE A)
  // ==========================================
  public getSubClients(companyId?: string): SubClient[] {
    if (companyId) {
      return (this.data.sub_clients || []).filter((s) => s.company_id === companyId);
    }
    return this.data.sub_clients || [];
  }

  public getSubClient(id: string): SubClient | undefined {
    return (this.data.sub_clients || []).find((s) => s.id === id);
  }

  public createSubClient(data: Omit<SubClient, 'id' | 'created_at' | 'updated_at'>): SubClient {
    const now = new Date().toISOString();
    const item: SubClient = {
      ...data,
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: now,
      updated_at: now,
    };
    if (!this.data.sub_clients) this.data.sub_clients = [];
    this.data.sub_clients.push(item);
    this.save();
    return item;
  }

  public updateSubClient(id: string, updates: Partial<SubClient>): SubClient | null {
    if (!this.data.sub_clients) return null;
    const idx = this.data.sub_clients.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.data.sub_clients[idx] = {
      ...this.data.sub_clients[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
    return this.data.sub_clients[idx];
  }

  public deleteSubClient(id: string): boolean {
    if (!this.data.sub_clients) return false;
    const initial = this.data.sub_clients.length;
    this.data.sub_clients = this.data.sub_clients.filter((s) => s.id !== id);
    if (this.data.sub_clients.length !== initial) {
      if (this.data.drive_documents) {
        this.data.drive_documents = this.data.drive_documents.filter((d) => d.sub_client_id !== id);
      }
      this.save();
      return true;
    }
    return false;
  }

  // ==========================================
  // DRIVE DOCUMENTS & FOTOS VINCULADAS
  // ==========================================
  public getDriveDocuments(filter?: {
    companyId?: string;
    subClientId?: string;
    category?: string;
  }): DriveDocument[] {
    const docs = this.data.drive_documents || [];
    return docs.filter((d) => {
      if (filter?.companyId && d.company_id !== filter.companyId) return false;
      if (filter?.subClientId && d.sub_client_id !== filter.subClientId) return false;
      if (filter?.category && d.category !== filter.category) return false;
      return true;
    });
  }

  public getDriveDocument(id: string): DriveDocument | undefined {
    return (this.data.drive_documents || []).find((d) => d.id === id);
  }

  public createDriveDocument(data: Omit<DriveDocument, 'id' | 'created_at' | 'updated_at'>): DriveDocument {
    const now = new Date().toISOString();
    const item: DriveDocument = {
      ...data,
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: now,
      updated_at: now,
    };
    if (!this.data.drive_documents) this.data.drive_documents = [];
    this.data.drive_documents.push(item);
    this.save();
    return item;
  }

  public updateDriveDocument(id: string, updates: Partial<DriveDocument>): DriveDocument | null {
    if (!this.data.drive_documents) return null;
    const idx = this.data.drive_documents.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    this.data.drive_documents[idx] = {
      ...this.data.drive_documents[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
    return this.data.drive_documents[idx];
  }

  public deleteDriveDocument(id: string): boolean {
    if (!this.data.drive_documents) return false;
    const initial = this.data.drive_documents.length;
    this.data.drive_documents = this.data.drive_documents.filter((d) => d.id !== id);
    if (this.data.drive_documents.length !== initial) {
      this.save();
      return true;
    }
    return false;
  }

  // ==========================================
  // DRIVE SETTINGS (CONEXÃO ESCOLHIDA PELO DEV)
  // ==========================================
  public getDriveSettings(): DriveSettings {
    if (!this.data.drive_settings) {
      this.data.drive_settings = {
        connected: false,
        root_folder_name: 'MÍDIA INDOOR - ARQUIVOS DO SISTEMA',
      };
    }
    return this.data.drive_settings;
  }

  public updateDriveSettings(settings: Partial<DriveSettings>): DriveSettings {
    this.data.drive_settings = {
      ...this.getDriveSettings(),
      ...settings,
      last_synced_at: new Date().toISOString(),
    };
    this.save();
    return this.data.drive_settings;
  }
}

export const db = new DatabaseStore();
