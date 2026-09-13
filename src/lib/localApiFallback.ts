import { localStore } from './localStore';
import { User, Company, Plan, Player, Operator, Playlist, Media, RssFeed, CallPhrase, PlayerCall, AdminStats, CompanyStats, WeatherData } from '../types';

let currentUser: User | null = null;
let currentCompany: { id: string; name: string } | undefined = undefined;
let currentPlayer: Player | undefined = undefined;

export async function handleLocalFallback<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const db = localStore.getData();
  const now = new Date().toISOString();
  let body: any = {};
  if (options.body && typeof options.body === 'string') {
    try {
      body = JSON.parse(options.body);
    } catch {
      body = {};
    }
  }

  // Auth: Login
  if (endpoint === '/auth/login' && method === 'POST') {
    const { email, playerCode, token: playerToken } = body;

    // Login do Player por código ou token
    if (playerCode || playerToken) {
      const code = (playerCode || 'TV-1001').toUpperCase();
      let player = db.players.find((p) => p.code.toUpperCase() === code || p.access_token === playerToken);
      if (!player) {
        player = {
          id: `play-${Date.now()}`,
          company_id: 'comp-demo-1',
          user_id: `usr-play-${Date.now()}`,
          name: `TV ${code}`,
          code,
          location: 'Recepção / Salão',
          description: 'Painel criado localmente',
          orientation: code.includes('VERT') || code.includes('1002') ? 'vertical' : 'horizontal',
          playlist_id: db.playlists[0]?.id || null,
          status: 'active',
          access_token: `tok_local_${Date.now()}`,
          last_seen: now,
          created_at: now,
          updated_at: now,
        };
        db.players.push(player);
        localStore.persist();
      }

      const pUser: User = {
        id: player.user_id,
        name: player.name,
        email: `player_${player.code.toLowerCase()}@cast.com`,
        role: 'player',
        company_id: player.company_id,
      };

      currentUser = pUser;
      currentPlayer = player;
      currentCompany = { id: 'comp-demo-1', name: 'Drogaria São Paulo - Matriz' };

      return {
        token: `local_tok_play_${Date.now()}`,
        user: pUser,
        company: currentCompany,
        player,
      } as unknown as T;
    }

    // Login administrativo / empresa / operador por e-mail
    const userEmail = (email || '').toLowerCase().trim();
    let role: 'admin' | 'company' | 'operator' = 'company';
    let name = 'Gerente Drogaria São Paulo';
    let companyId: string | null = 'comp-demo-1';

    if (userEmail.includes('admin') || userEmail.includes('ale11062')) {
      role = 'admin';
      name = 'Administrador Geral';
      companyId = null;
    } else if (userEmail.includes('operador') || userEmail.includes('op')) {
      role = 'operator';
      name = 'Carlos Atendimento';
    }

    const u: User = {
      id: `usr-${role}-local`,
      name,
      email: userEmail || `${role}@cast.com`,
      role,
      company_id: companyId,
      must_change_password: false,
    };

    currentUser = u;
    currentCompany = companyId ? { id: companyId, name: 'Drogaria São Paulo - Matriz' } : undefined;

    return {
      token: `local_tok_${role}_${Date.now()}`,
      user: u,
      company: currentCompany,
    } as unknown as T;
  }

  // Auth: Me
  if (endpoint === '/auth/me') {
    if (!currentUser) {
      currentUser = {
        id: 'usr-comp-local',
        name: 'Gerente Drogaria São Paulo',
        email: 'empresa@cast.com',
        role: 'company',
        company_id: 'comp-demo-1',
      };
      currentCompany = { id: 'comp-demo-1', name: 'Drogaria São Paulo - Matriz' };
    }
    return {
      user: currentUser,
      company: currentCompany,
      player: currentPlayer,
    } as unknown as T;
  }

  // Auth: Change password
  if (endpoint === '/auth/change-password') {
    return { message: 'Senha redefinida com sucesso no banco local!' } as unknown as T;
  }

  // Auth: Forgot password
  if (endpoint === '/auth/forgot-password') {
    return { message: 'Instruções enviadas para seu e-mail.' } as unknown as T;
  }

  // Admin: Stats
  if (endpoint === '/admin/stats') {
    const stats: AdminStats = {
      totalCompanies: db.companies.length,
      activeCompanies: db.companies.filter((c) => c.status === 'active').length,
      inactiveCompanies: db.companies.filter((c) => c.status !== 'active').length,
      totalPlayers: db.players.length,
    };
    return stats as unknown as T;
  }

  // Admin: Companies
  if (endpoint === '/admin/companies') {
    if (method === 'GET') {
      return db.companies as unknown as T;
    }
    if (method === 'POST') {
      const newCompany: Company = {
        id: `comp-${Date.now()}`,
        legal_name: body.legal_name || 'Nova Empresa LTDA',
        trade_name: body.trade_name || body.legal_name || 'Nova Empresa',
        cnpj: body.cnpj || '00.000.000/0001-00',
        email: body.email || 'contato@empresa.com',
        phone: body.phone || '(11) 90000-0000',
        responsible: body.responsible || 'Responsável',
        address: body.address || 'Endereço',
        city: body.city || 'São Paulo',
        state: body.state || 'SP',
        plan_id: body.plan_id || 'plan-call-inter',
        start_date: body.start_date || now.split('T')[0],
        due_date: body.due_date || '2027-01-01',
        status: 'active',
        created_at: now,
        updated_at: now,
      };
      db.companies.push(newCompany);
      localStore.persist();
      return newCompany as unknown as T;
    }
  }

  if (endpoint.startsWith('/admin/companies/')) {
    const compId = endpoint.split('/')[3];
    const company = db.companies.find((c) => c.id === compId);
    if (method === 'PUT' && company) {
      Object.assign(company, body, { updated_at: now });
      localStore.persist();
      return company as unknown as T;
    }
    if (endpoint.endsWith('/toggle-status') && company) {
      company.status = company.status === 'active' ? 'inactive' : 'active';
      localStore.persist();
      return { message: 'Status alterado', status: company.status } as unknown as T;
    }
    if (endpoint.endsWith('/reset-password')) {
      return { message: 'Senha redefinida' } as unknown as T;
    }
  }

  // Admin: Plans
  if (endpoint === '/admin/plans') {
    if (method === 'GET') {
      return db.plans as unknown as T;
    }
    if (method === 'POST') {
      const newPlan: Plan = {
        id: `plan-${Date.now()}`,
        name: body.name || 'Novo Plano',
        description: body.description || '',
        max_players: body.max_players || 1,
        max_operators: body.max_operators || 0,
        max_storage: body.max_storage || 50,
        monthly_price: body.monthly_price || 49.0,
        active: true,
        created_at: now,
        updated_at: now,
      };
      db.plans.push(newPlan);
      localStore.persist();
      return newPlan as unknown as T;
    }
  }

  // Company: Stats
  if (endpoint === '/company/stats') {
    const activePlayers = db.players.filter((p) => p.status === 'active').length;
    const stats: CompanyStats = {
      playersCount: db.players.length,
      activePlayersCount: activePlayers,
      onlinePlayersCount: activePlayers,
      operatorsCount: db.operators.length,
      playlistsCount: db.playlists.length,
      mediaCount: db.media.length,
      plan: db.plans.find((p) => p.id === 'plan-call-inter') || db.plans[0],
      limits: {
        max_players: 3,
        max_operators: 12,
        max_storage: 150,
      },
    };
    return stats as unknown as T;
  }

  // Company: Players
  if (endpoint === '/company/players') {
    if (method === 'GET') {
      return db.players as unknown as T;
    }
    if (method === 'POST') {
      const newPlayer: Player = {
        id: `play-${Date.now()}`,
        company_id: 'comp-demo-1',
        user_id: `usr-play-${Date.now()}`,
        name: body.name || 'Novo Player',
        code: (body.code || `TV-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase(),
        location: body.location || 'Salão',
        description: body.description || '',
        orientation: body.orientation || 'horizontal',
        playlist_id: body.playlist_id || db.playlists[0]?.id || null,
        status: 'active',
        is_online: true,
        access_token: `tok_${Date.now()}`,
        last_seen: now,
        created_at: now,
        updated_at: now,
      };
      db.players.push(newPlayer);
      localStore.persist();
      return newPlayer as unknown as T;
    }
  }

  if (endpoint.startsWith('/company/players/')) {
    const parts = endpoint.split('/');
    const playerId = parts[3];
    const player = db.players.find((p) => p.id === playerId);
    if (method === 'PUT' && player) {
      Object.assign(player, body, { updated_at: now });
      localStore.persist();
      return player as unknown as T;
    }
    if (method === 'DELETE' && player) {
      db.players = db.players.filter((p) => p.id !== playerId);
      localStore.persist();
      return { message: 'Player excluído' } as unknown as T;
    }
    if (endpoint.endsWith('/toggle-status') && player) {
      player.status = player.status === 'active' ? 'inactive' : 'active';
      localStore.persist();
      return { message: 'Status alterado', status: player.status } as unknown as T;
    }
    if (endpoint.endsWith('/regenerate-token') && player) {
      player.access_token = `tok_${Date.now()}`;
      localStore.persist();
      return { message: 'Token renovado', access_token: player.access_token, player } as unknown as T;
    }
  }

  // Company: Operators
  if (endpoint === '/company/operators') {
    if (method === 'GET') {
      return db.operators as unknown as T;
    }
    if (method === 'POST') {
      const newOp: Operator = {
        id: `op-${Date.now()}`,
        company_id: 'comp-demo-1',
        user_id: `usr-op-${Date.now()}`,
        name: body.name || 'Novo Operador',
        email: body.email || `operador${Date.now()}@cast.com`,
        phone: body.phone || '(11) 90000-0000',
        active: true,
        created_at: now,
        updated_at: now,
      };
      db.operators.push(newOp);
      localStore.persist();
      return newOp as unknown as T;
    }
  }

  // Company: Media
  if (endpoint === '/company/media') {
    if (method === 'GET') {
      return db.media as unknown as T;
    }
    if (method === 'POST') {
      const newMedia: Media = {
        id: `med-${Date.now()}`,
        company_id: 'comp-demo-1',
        name: body.name || 'Nova Mídia',
        type: body.type || 'image',
        file_url: body.file_url || '',
        duration: body.duration || 10,
        active: true,
        created_at: now,
        updated_at: now,
      };
      db.media.push(newMedia);
      localStore.persist();
      return newMedia as unknown as T;
    }
  }

  if (endpoint.startsWith('/company/media/') && method === 'DELETE') {
    const medId = endpoint.split('/')[3];
    db.media = db.media.filter((m) => m.id !== medId);
    localStore.persist();
    return { message: 'Mídia removida' } as unknown as T;
  }

  // Company: Playlists
  if (endpoint === '/company/playlists') {
    if (method === 'GET') {
      return db.playlists as unknown as T;
    }
    if (method === 'POST') {
      const newPl: Playlist = {
        id: `pl-${Date.now()}`,
        company_id: 'comp-demo-1',
        name: body.name || 'Nova Playlist',
        description: body.description || '',
        weather_city: body.weather_city || 'São Paulo',
        active: true,
        items: body.items || [],
        created_at: now,
        updated_at: now,
      };
      db.playlists.push(newPl);
      localStore.persist();
      return newPl as unknown as T;
    }
  }

  if (endpoint.startsWith('/company/playlists/')) {
    const plId = endpoint.split('/')[3];
    const pl = db.playlists.find((p) => p.id === plId);
    if (method === 'PUT' && pl) {
      Object.assign(pl, body, { updated_at: now });
      localStore.persist();
      return pl as unknown as T;
    }
    if (method === 'DELETE' && pl) {
      db.playlists = db.playlists.filter((p) => p.id !== plId);
      localStore.persist();
      return { message: 'Playlist removida' } as unknown as T;
    }
  }

  // Company: RSS
  if (endpoint === '/company/rss') {
    if (method === 'GET') {
      return db.rss_feeds as unknown as T;
    }
    if (method === 'POST') {
      const newRss: RssFeed = {
        id: `rss-${Date.now()}`,
        company_id: 'comp-demo-1',
        name: body.name || 'Feed RSS',
        url: body.url || 'https://g1.globo.com/rss/g1/saude/',
        active: true,
        created_at: now,
        updated_at: now,
      };
      db.rss_feeds.push(newRss);
      localStore.persist();
      return newRss as unknown as T;
    }
  }

  // Operator: Dashboard
  if (endpoint === '/operator/dashboard') {
    return {
      players: db.players.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        location: p.location,
        orientation: p.orientation,
        is_online: true,
        last_seen: now,
      })),
      phrases: db.call_phrases,
    } as unknown as T;
  }

  // Operator: Phrases
  if (endpoint === '/operator/phrases') {
    if (method === 'GET') {
      return db.call_phrases as unknown as T;
    }
    if (method === 'POST') {
      const newPhrase: CallPhrase = {
        id: `phrase-${Date.now()}`,
        company_id: 'comp-demo-1',
        operator_id: null,
        phrase: body.phrase || 'Nova Frase de Chamada',
        active: true,
        created_at: now,
        updated_at: now,
      };
      db.call_phrases.push(newPhrase);
      localStore.persist();
      return newPhrase as unknown as T;
    }
  }

  // Operator: Trigger Call
  if (endpoint === '/operator/call' && method === 'POST') {
    const call: PlayerCall = {
      id: `call-${Date.now()}`,
      company_id: 'comp-demo-1',
      player_id: body.playerId || body.player_id || db.players[0]?.id || 'play-1',
      operator_id: 'op-1',
      phrase_id: body.phraseId || null,
      phrase: body.phrase || 'Próximo atendimento',
      duration: body.duration || 10,
      is_priority: Boolean(body.isPriority || body.is_priority),
      created_at: now,
    };
    db.player_calls.unshift(call);
    if (db.player_calls.length > 50) db.player_calls.pop();
    localStore.persist();
    localStore.broadcastCall(call);

    return {
      message: 'Chamada transmitida instantaneamente!',
      call,
      delivered: true,
    } as unknown as T;
  }

  // Player: Current
  if (endpoint.startsWith('/player/current')) {
    const urlObj = new URL('https://cast.local' + endpoint);
    const code = (urlObj.searchParams.get('code') || 'TV-1001').toUpperCase();
    const token = urlObj.searchParams.get('token');

    let player = db.players.find((p) => p.code.toUpperCase() === code || (token && p.access_token === token));
    if (!player) {
      player = db.players[0] || {
        id: 'play-1',
        company_id: 'comp-demo-1',
        user_id: 'usr-play-1',
        name: `TV ${code}`,
        code,
        location: 'Recepção / Salão',
        description: 'Painel de atendimento',
        orientation: 'horizontal',
        playlist_id: db.playlists[0]?.id || null,
        status: 'active',
        access_token: 'tok_demo_sala_1001',
        last_seen: now,
        created_at: now,
        updated_at: now,
      };
    }

    const playlist = db.playlists.find((p) => p.id === player?.playlist_id) || db.playlists[0];
    const items = (playlist?.items || []).map((item) => {
      const media = db.media.find((m) => m.id === item.media_id);
      return {
        id: item.id,
        media_id: item.media_id,
        position: item.position,
        duration: item.duration || 10,
        name: media?.name || 'Mídia',
        type: media?.type || 'image',
        file_url: media?.file_url || '',
      };
    });

    return {
      player: {
        id: player.id,
        name: player.name,
        code: player.code,
        access_token: player.access_token,
        location: player.location,
        orientation: player.orientation || 'horizontal',
      },
      company: { id: 'comp-demo-1', name: 'Drogaria São Paulo - Matriz' },
      playlist: playlist ? { id: playlist.id, name: playlist.name, weather_city: playlist.weather_city } : null,
      weatherCity: playlist?.weather_city || 'São Paulo',
      items,
      rssFeeds: db.rss_feeds,
    } as unknown as T;
  }

  // Player: Heartbeat
  if (endpoint === '/player/heartbeat') {
    return { status: 'alive' } as unknown as T;
  }

  // Player: Active Call
  if (endpoint.startsWith('/player/active-call')) {
    const latestCall = db.player_calls.length > 0 ? db.player_calls[0] : null;
    return { activeCall: latestCall } as unknown as T;
  }

  // Weather
  if (endpoint.startsWith('/weather')) {
    const urlObj = new URL('https://cast.local' + endpoint);
    const city = urlObj.searchParams.get('city') || 'São Paulo';
    const weatherData: WeatherData = {
      city,
      temp: 24,
      apparentTemp: 25,
      humidity: 65,
      windSpeed: 12,
      weatherCode: 1,
      text: 'Predomínio de Sol',
      forecast: [
        { date: '2026-09-13', dayName: 'seg', max: 27, min: 18, weatherCode: 1, text: 'Sol e Nuvens' },
        { date: '2026-09-14', dayName: 'ter', max: 28, min: 19, weatherCode: 2, text: 'Parcialmente Nublado' },
        { date: '2026-09-15', dayName: 'qua', max: 25, min: 17, weatherCode: 61, text: 'Pancadas de Chuva' },
        { date: '2026-09-16', dayName: 'qui', max: 26, min: 17, weatherCode: 1, text: 'Sol' },
        { date: '2026-09-17', dayName: 'sex', max: 29, min: 18, weatherCode: 0, text: 'Céu Aberto' },
      ],
    };
    return weatherData as unknown as T;
  }

  // Upload
  if (endpoint === '/upload' && method === 'POST') {
    return {
      url: body.fileData || '',
      filename: body.filename || 'upload.jpg',
      originalName: body.filename || 'upload.jpg',
      size: (body.fileData || '').length,
      mimeType: body.mimeType || 'image/jpeg',
    } as unknown as T;
  }

  // Drive Settings & SubClients
  if (endpoint === '/drive/settings') {
    return { status: 'ok', settings: db.drive_settings } as unknown as T;
  }
  if (endpoint.startsWith('/sub-clients') || endpoint.startsWith('/companies/')) {
    return { status: 'ok', subClients: db.sub_clients || [] } as unknown as T;
  }
  if (endpoint.startsWith('/drive/documents')) {
    return { status: 'ok', documents: db.drive_documents || [] } as unknown as T;
  }

  // Fallback padrão
  return { status: 'ok', message: 'Executado via local fallback store' } as unknown as T;
}
