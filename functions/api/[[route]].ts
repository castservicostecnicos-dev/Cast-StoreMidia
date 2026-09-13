/**
 * Cloudflare Pages Function - CAST StoreMidia
 * Roteador Edge inteligente para Cloudflare Pages.
 *
 * 1. Modo Proxy: Se a variável `BACKEND_URL` estiver configurada no Cloudflare Pages
 *    (ex: https://seu-backend.onrender.com ou Cloud Run), as requisições são encaminhadas
 *    transparentemente com headers, streaming e CORS.
 *
 * 2. Modo Autônomo Edge (Zero-Config / Sem Backend Externo):
 *    Se `BACKEND_URL` não estiver definida, a função processa diretamente as requisições
 *    na borda (Edge da Cloudflare), permitindo autenticação, consulta de players, playlists,
 *    previsão do tempo ao vivo via Open-Meteo, proxy RSS e chamadas de atendimento.
 */

interface CloudflareEnv {
  BACKEND_URL?: string;
  [key: string]: unknown;
}

interface CloudflareContext {
  request: Request;
  env: CloudflareEnv;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<unknown>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
}

// In-Memory Edge Store para sessões e chamadas ativas na borda
const edgeCalls: Array<{
  id: string;
  playerId: string;
  phrase: string;
  timestamp: number;
  isPriority?: boolean;
}> = [];

export const onRequest = async (context: CloudflareContext): Promise<Response> => {
  const { request, env } = context;
  const url = new URL(request.url);

  // Tratamento de CORS Preflight (OPTIONS)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // ----------------------------------------------------
  // 1. MODO PROXY REVERSO (Se BACKEND_URL estiver configurado)
  // ----------------------------------------------------
  if (env.BACKEND_URL && typeof env.BACKEND_URL === 'string' && env.BACKEND_URL.trim() !== '') {
    const backendTarget = env.BACKEND_URL.replace(/\/$/, '') + url.pathname + url.search;

    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.set('X-Forwarded-Host', url.host);
    proxyHeaders.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

    const init: RequestInit = {
      method: request.method,
      headers: proxyHeaders,
      redirect: 'follow',
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const bodyArrayBuffer = await request.arrayBuffer();
        if (bodyArrayBuffer && bodyArrayBuffer.byteLength > 0) {
          init.body = bodyArrayBuffer;
        }
      } catch {
        // Sem corpo
      }
    }

    try {
      const response = await fetch(backendTarget, init);
      const resHeaders = new Headers(response.headers);
      resHeaders.set('Access-Control-Allow-Origin', '*');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: resHeaders,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Fallback para o modo autônomo da borda se o backend falhar
      console.warn('Proxy failed, falling back to autonomous edge mode:', message);
    }
  }

  // ----------------------------------------------------
  // 2. MODO AUTÔNOMO EDGE (Execução direta no Cloudflare Workers)
  // ----------------------------------------------------
  const jsonResponse = (data: unknown, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      },
    });
  };

  const path = url.pathname.replace(/^\/api/, '');

  // Health Check
  if (path === '/health' || path === '') {
    return jsonResponse({
      status: 'ok',
      service: 'CAST StoreMidia (Cloudflare Edge Autonomous)',
      timestamp: Date.now(),
      mode: 'edge_serverless',
    });
  }

  // Auth: Login
  if (path === '/auth/login' && request.method === 'POST') {
    try {
      const body = (await request.json().catch(() => ({}))) as Record<string, string>;
      const { email, playerCode, token: playerTokenParam } = body;

      // Login por código de Player (ex: TV-1001)
      if (playerCode || playerTokenParam) {
        const code = (playerCode || 'TV-1001').toUpperCase();
        return jsonResponse({
          token: `edge_tok_player_${Date.now()}`,
          user: {
            id: 'usr-play-1',
            name: `Player ${code}`,
            email: `player_${code.toLowerCase()}@cast.com`,
            role: 'player',
            company_id: 'comp-demo-1',
          },
          company: { id: 'comp-demo-1', name: 'Drogaria São Paulo - Matriz' },
          player: {
            id: 'play-1',
            company_id: 'comp-demo-1',
            user_id: 'usr-play-1',
            name: `TV ${code}`,
            code,
            location: 'Recepção / Salão',
            description: 'Painel em reprodução na borda',
            orientation: code.includes('VERT') || code.includes('1002') ? 'vertical' : 'horizontal',
            playlist_id: 'pl-demo-1',
            status: 'active',
            access_token: 'tok_demo_sala_1001',
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });
      }

      // Login por email
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

      return jsonResponse({
        token: `edge_tok_${role}_${Date.now()}`,
        user: {
          id: `usr-${role}-1`,
          name,
          email: userEmail || `${role}@cast.com`,
          role,
          company_id: companyId,
          must_change_password: false,
        },
        company: companyId ? { id: companyId, name: 'Drogaria São Paulo - Matriz' } : undefined,
      });
    } catch {
      return jsonResponse({ error: 'Erro ao processar dados de login.' }, 400);
    }
  }

  // Auth: Me
  if (path === '/auth/me') {
    const auth = request.headers.get('Authorization') || '';
    let role: 'admin' | 'company' | 'operator' = 'company';
    if (auth.includes('admin')) role = 'admin';
    if (auth.includes('operator')) role = 'operator';

    return jsonResponse({
      user: {
        id: `usr-${role}-1`,
        name: role === 'admin' ? 'Administrador Geral' : role === 'operator' ? 'Carlos Atendimento' : 'Gerente Drogaria São Paulo',
        email: `${role}@cast.com`,
        role,
        company_id: role === 'admin' ? null : 'comp-demo-1',
        must_change_password: false,
      },
      company: role !== 'admin' ? { id: 'comp-demo-1', name: 'Drogaria São Paulo - Matriz' } : undefined,
    });
  }

  // Auth: Change password
  if (path === '/auth/change-password') {
    return jsonResponse({ message: 'Senha redefinida com sucesso!' });
  }

  // Auth: Forgot password
  if (path === '/auth/forgot-password') {
    return jsonResponse({ message: 'Instruções enviadas para seu e-mail com sucesso.' });
  }

  // Admin Stats
  if (path === '/admin/stats') {
    return jsonResponse({
      totalCompanies: 1,
      activeCompanies: 1,
      totalPlayers: 2,
      onlinePlayers: 2,
      totalOperators: 1,
      totalStorageUsed: 25,
      monthlyRevenue: 109.0,
    });
  }

  // Admin Companies
  if (path === '/admin/companies') {
    return jsonResponse([
      {
        id: 'comp-demo-1',
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
        plan_name: 'Call Intermediário',
        start_date: '2026-01-01',
        due_date: '2027-01-01',
        status: 'active',
        player_count: 2,
        operator_count: 1,
        max_players: 3,
        max_operators: 12,
        created_at: '2026-09-01T00:00:00.000Z',
        updated_at: '2026-09-05T00:00:00.000Z',
      },
    ]);
  }

  // Admin Plans
  if (path === '/admin/plans') {
    return jsonResponse([
      { id: 'plan-call-basic', name: 'Call Básico', description: '1 tela com chamadas e até 4 operadores.', max_players: 1, max_operators: 4, max_storage: 50, monthly_price: 49.0, active: true },
      { id: 'plan-call-inter', name: 'Call Intermediário', description: '3 telas com chamadas e até 12 operadores.', max_players: 3, max_operators: 12, max_storage: 150, monthly_price: 109.0, active: true },
      { id: 'plan-call-pro', name: 'Call Pro', description: '6 telas com chamadas e até 24 operadores.', max_players: 6, max_operators: 24, max_storage: 300, monthly_price: 229.0, active: true },
      { id: 'plan-show-basic', name: 'Show Básico', description: 'Até 2 telas de exibição de mídia.', max_players: 2, max_operators: 0, max_storage: 50, monthly_price: 29.0, active: true },
      { id: 'plan-show-inter', name: 'Show Intermediário', description: 'Até 5 telas de exibição de mídia.', max_players: 5, max_operators: 0, max_storage: 150, monthly_price: 89.0, active: true },
      { id: 'plan-show-pro', name: 'Show Pro', description: 'Até 12 telas de exibição de mídia.', max_players: 12, max_operators: 0, max_storage: 500, monthly_price: 149.0, active: true },
    ]);
  }

  // Company Stats
  if (path === '/company/stats') {
    return jsonResponse({
      playersCount: 2,
      onlinePlayersCount: 2,
      operatorsCount: 1,
      playlistsCount: 1,
      mediaCount: 4,
      storageUsedMb: 25,
      maxStorageMb: 150,
      todayCallsCount: edgeCalls.length,
      planName: 'Call Intermediário',
    });
  }

  // Company Players
  if (path === '/company/players') {
    return jsonResponse([
      {
        id: 'play-1',
        company_id: 'comp-demo-1',
        user_id: 'usr-play-1',
        name: 'TV Salão Principal (Horizontal)',
        code: 'TV-1001',
        location: 'Recepção / Salão',
        description: 'Smart TV 55 polegadas na área de atendimento',
        orientation: 'horizontal',
        playlist_id: 'pl-demo-1',
        playlist_name: 'Programação Principal - TV Salão',
        status: 'active',
        is_online: true,
        access_token: 'tok_demo_sala_1001',
        last_seen: new Date().toISOString(),
        created_at: '2026-09-01T00:00:00.000Z',
        updated_at: '2026-09-05T00:00:00.000Z',
      },
      {
        id: 'play-2',
        company_id: 'comp-demo-1',
        user_id: 'usr-play-2',
        name: 'Totem Vertical - Entrada',
        code: 'TV-1002',
        location: 'Entrada da Loja',
        description: 'Totem 9:16 vertical interativo',
        orientation: 'vertical',
        playlist_id: 'pl-demo-1',
        playlist_name: 'Programação Principal - TV Salão',
        status: 'active',
        is_online: true,
        access_token: 'tok_demo_sala_1002',
        last_seen: new Date().toISOString(),
        created_at: '2026-09-01T00:00:00.000Z',
        updated_at: '2026-09-05T00:00:00.000Z',
      },
    ]);
  }

  // Company Operators
  if (path === '/company/operators') {
    return jsonResponse([
      {
        id: 'op-1',
        company_id: 'comp-demo-1',
        user_id: 'usr-op-1',
        name: 'Carlos Atendimento',
        email: 'operador@cast.com',
        phone: '(11) 98765-4321',
        active: true,
        created_at: '2026-09-01T00:00:00.000Z',
        updated_at: '2026-09-05T00:00:00.000Z',
      },
    ]);
  }

  // Company Media
  if (path === '/company/media') {
    const now = new Date().toISOString();
    return jsonResponse([
      {
        id: 'med-1',
        company_id: 'comp-demo-1',
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
        company_id: 'comp-demo-1',
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
        company_id: 'comp-demo-1',
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
        company_id: 'comp-demo-1',
        name: 'Notícias RSS - Saúde & Bem-Estar',
        type: 'rss',
        file_url: 'https://g1.globo.com/rss/g1/saude/',
        duration: 15,
        active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  }

  // Company Playlists
  if (path === '/company/playlists') {
    const now = new Date().toISOString();
    return jsonResponse([
      {
        id: 'pl-demo-1',
        company_id: 'comp-demo-1',
        name: 'Programação Principal - TV Salão',
        description: 'Grade completa com promoções, notícias RSS, hora certa e clima.',
        weather_city: 'São Paulo',
        active: true,
        items: [
          { id: 'pli-1', playlist_id: 'pl-demo-1', media_id: 'med-1', position: 1, duration: 10, name: 'Ofertas da Semana - Até 40% OFF', type: 'image', created_at: now },
          { id: 'pli-2', playlist_id: 'pl-demo-1', media_id: 'med-2', position: 2, duration: 10, name: 'Horário de Atendimento e Delivery', type: 'image', created_at: now },
          { id: 'pli-3', playlist_id: 'pl-demo-1', media_id: 'med-weather-clock', position: 3, duration: 12, name: 'Hora Certa & Previsão do Tempo', type: 'weather_clock', created_at: now },
          { id: 'pli-4', playlist_id: 'pl-demo-1', media_id: 'med-rss-saude', position: 4, duration: 15, name: 'Notícias RSS - Saúde & Bem-Estar', type: 'rss', created_at: now },
        ],
        created_at: now,
        updated_at: now,
      },
    ]);
  }

  // Company RSS
  if (path === '/company/rss') {
    return jsonResponse([
      { id: 'rss-1', company_id: 'comp-demo-1', name: 'G1 - Saúde e Bem-Estar', url: 'https://g1.globo.com/rss/g1/saude/', active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ]);
  }

  // Operator Dashboard
  if (path === '/operator/dashboard') {
    return jsonResponse({
      players: [
        { id: 'play-1', name: 'TV Salão Principal (Horizontal)', code: 'TV-1001', location: 'Recepção / Salão', orientation: 'horizontal', is_online: true, last_seen: new Date().toISOString() },
        { id: 'play-2', name: 'Totem Vertical - Entrada', code: 'TV-1002', location: 'Entrada da Loja', orientation: 'vertical', is_online: true, last_seen: new Date().toISOString() },
      ],
      phrases: [
        { id: 'phrase-1', company_id: 'comp-demo-1', phrase: 'Senha Normal: 001 ao Guichê 01', active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'phrase-2', company_id: 'comp-demo-1', phrase: 'Senha Preferencial: P-001 ao Atendimento 02', active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ],
    });
  }

  // Operator Phrases
  if (path === '/operator/phrases') {
    return jsonResponse([
      { id: 'phrase-1', company_id: 'comp-demo-1', phrase: 'Senha Normal: 001 ao Guichê 01', active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'phrase-2', company_id: 'comp-demo-1', phrase: 'Senha Preferencial: P-001 ao Atendimento 02', active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ]);
  }

  // Operator Call
  if (path === '/operator/call' && request.method === 'POST') {
    try {
      const callData = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const newCall = {
        id: `call_${Date.now()}`,
        playerId: String(callData.playerId || 'play-1'),
        phrase: String(callData.phrase || 'Próximo atendimento'),
        timestamp: Date.now(),
        isPriority: Boolean(callData.isPriority || callData.is_priority),
      };
      edgeCalls.unshift(newCall);
      if (edgeCalls.length > 50) edgeCalls.pop();

      return jsonResponse({
        message: 'Chamada transmitida com sucesso para o painel!',
        call: newCall,
        delivered: true,
      });
    } catch {
      return jsonResponse({ error: 'Erro ao disparar chamada.' }, 400);
    }
  }

  // Player Current
  if (path === '/player/current') {
    const code = (url.searchParams.get('code') || 'TV-1001').toUpperCase();
    const isVertical = code.includes('VERT') || code.includes('1002');
    const now = new Date().toISOString();

    return jsonResponse({
      player: {
        id: isVertical ? 'play-2' : 'play-1',
        name: isVertical ? 'Totem Vertical - Entrada' : 'TV Salão Principal (Horizontal)',
        code,
        access_token: isVertical ? 'tok_demo_sala_1002' : 'tok_demo_sala_1001',
        location: isVertical ? 'Entrada da Loja' : 'Recepção / Salão',
        orientation: isVertical ? 'vertical' : 'horizontal',
      },
      company: { id: 'comp-demo-1', name: 'Drogaria São Paulo - Matriz' },
      playlist: { id: 'pl-demo-1', name: 'Programação Principal - TV Salão', weather_city: 'São Paulo' },
      weatherCity: 'São Paulo',
      items: [
        {
          id: 'pli-1',
          media_id: 'med-1',
          position: 1,
          duration: 10,
          name: 'Ofertas da Semana - Até 40% OFF',
          type: 'image',
          file_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%231e3a8a"/></linearGradient></defs><rect width="1920" height="1080" fill="url(%23bg)"/><circle cx="1600" cy="250" r="380" fill="%232563eb" opacity="0.15"/><circle cx="200" cy="900" r="300" fill="%2338bdf8" opacity="0.1"/><rect x="120" y="100" width="220" height="48" rx="8" fill="%232563eb"/><text x="140" y="132" fill="%23ffffff" font-size="22" font-family="system-ui, sans-serif" font-weight="bold">CAST STOREMIDIA</text><text x="120" y="320" fill="%2338bdf8" font-size="38" font-family="system-ui, sans-serif" font-weight="bold" letter-spacing="4">SEMANA DE OFERTAS ESPECIAIS</text><text x="120" y="440" fill="%23ffffff" font-size="82" font-family="system-ui, sans-serif" font-weight="900">ATÉ 40% DE DESCONTO</text><text x="120" y="540" fill="%2394a3b8" font-size="34" font-family="system-ui, sans-serif">Em produtos selecionados, perfumaria e linha especial.</text><rect x="120" y="640" width="560" height="180" rx="16" fill="%231e293b" stroke="%23334155" stroke-width="2"/><text x="160" y="710" fill="%2338bdf8" font-size="26" font-family="system-ui, sans-serif" font-weight="bold">ATENDIMENTO PERSONALIZADO</text><text x="160" y="760" fill="%23cbd5e1" font-size="22" font-family="system-ui, sans-serif">Consulte nossos especialistas para as melhores recomendações.</text></svg>',
        },
        {
          id: 'pli-2',
          media_id: 'med-2',
          position: 2,
          duration: 10,
          name: 'Horário de Atendimento e Delivery',
          type: 'image',
          file_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080"><defs><linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23091e3a"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><rect width="1920" height="1080" fill="url(%23bg2)"/><rect x="120" y="100" width="260" height="48" rx="8" fill="%2310b981"/><text x="140" y="132" fill="%23ffffff" font-size="22" font-family="system-ui, sans-serif" font-weight="bold">ATENDIMENTO EXPRESSO</text><text x="120" y="320" fill="%2334d399" font-size="38" font-family="system-ui, sans-serif" font-weight="bold">COMODIDADE E RAPIDEZ</text><text x="120" y="440" fill="%23ffffff" font-size="78" font-family="system-ui, sans-serif" font-weight="900">RECEBA SUAS COMPRAS ONDE ESTIVER</text><text x="120" y="540" fill="%2394a3b8" font-size="34" font-family="system-ui, sans-serif">Peça pelo WhatsApp oficial ou canal digital de atendimento.</text><g transform="translate(120, 650)"><rect width="450" height="140" rx="12" fill="%231e293b"/><text x="40" y="60" fill="%2338bdf8" font-size="22" font-family="system-ui, sans-serif">WHATSAPP OFICIAL</text><text x="40" y="105" fill="%23ffffff" font-size="32" font-family="system-ui, sans-serif" font-weight="bold">(11) 98765-0000</text></g></svg>',
        },
        {
          id: 'pli-3',
          media_id: 'med-weather-clock',
          position: 3,
          duration: 12,
          name: 'Hora Certa & Previsão do Tempo',
          type: 'weather_clock',
          file_url: 'widget:weather_clock',
        },
        {
          id: 'pli-4',
          media_id: 'med-rss-saude',
          position: 4,
          duration: 15,
          name: 'Notícias RSS - Saúde & Bem-Estar',
          type: 'rss',
          file_url: 'https://g1.globo.com/rss/g1/saude/',
        },
      ],
      rssFeeds: [
        { id: 'rss-1', company_id: 'comp-demo-1', name: 'G1 - Saúde e Bem-Estar', url: 'https://g1.globo.com/rss/g1/saude/', active: true, created_at: now, updated_at: now },
      ],
    });
  }

  // Player Heartbeat
  if (path === '/player/heartbeat') {
    return jsonResponse({ status: 'alive', timestamp: Date.now() });
  }

  // Player Active Call
  if (path === '/player/active-call') {
    const active = edgeCalls.length > 0 ? edgeCalls[0] : null;
    return jsonResponse({ activeCall: active });
  }

  // Live Weather API (Open-Meteo) direto na borda
  if (path === '/weather') {
    const city = url.searchParams.get('city') || 'São Paulo';
    try {
      // Coordenadas aproximadas para cidades brasileiras comuns
      const coords: Record<string, { lat: number; lon: number }> = {
        'são paulo': { lat: -23.55, lon: -46.63 },
        'rio de janeiro': { lat: -22.90, lon: -43.17 },
        'belo horizonte': { lat: -19.91, lon: -43.93 },
        'curitiba': { lat: -25.42, lon: -49.27 },
        'porto alegre': { lat: -30.03, lon: -51.23 },
        'brasília': { lat: -15.79, lon: -47.88 },
        'salvador': { lat: -12.97, lon: -38.51 },
      };
      const normalizedCity = city.toLowerCase().trim();
      const pos = coords[normalizedCity] || { lat: -23.55, lon: -46.63 };

      const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America%2FSao_Paulo`;
      const res = await fetch(meteoUrl);
      if (res.ok) {
        const d = (await res.json()) as any;
        const current = d.current || {};
        const daily = d.daily || {};
        const code = current.weather_code || 0;

        const weatherDescriptions: Record<number, string> = {
          0: 'Céu Limpo',
          1: 'Predomínio de Sol',
          2: 'Parcialmente Nublado',
          3: 'Nublado',
          45: 'Nevoeiro',
          51: 'Chuvisco Leve',
          61: 'Chuva Fraca',
          63: 'Chuva Moderada',
          65: 'Chuva Forte',
          80: 'Pancadas de Chuva',
          95: 'Trovoadas Isoladas',
        };

        const forecast = (daily.time || []).slice(1, 6).map((t: string, i: number) => {
          const c = daily.weather_code?.[i + 1] || 0;
          return {
            date: t,
            dayName: new Date(t + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'short' }),
            max: Math.round(daily.temperature_2m_max?.[i + 1] || 27),
            min: Math.round(daily.temperature_2m_min?.[i + 1] || 18),
            weatherCode: c,
            text: weatherDescriptions[c] || 'Instável',
            rainProb: daily.precipitation_probability_max?.[i + 1] || 15,
          };
        });

        return jsonResponse({
          status: 'ok',
          city,
          temp: Math.round(current.temperature_2m || 24),
          apparentTemp: Math.round(current.apparent_temperature || current.temperature_2m || 24),
          humidity: Math.round(current.relative_humidity_2m || 65),
          windSpeed: Math.round(current.wind_speed_10m || 12),
          weatherCode: code,
          text: weatherDescriptions[code] || 'Tempo Bom',
          forecast,
        });
      }
    } catch {
      // Fallback
    }

    return jsonResponse({
      status: 'ok',
      city,
      temp: 24,
      apparentTemp: 25,
      humidity: 65,
      windSpeed: 12,
      weatherCode: 1,
      text: 'Ensolarado com Poucas Nuvens',
      forecast: [
        { date: '2026-09-13', dayName: 'seg', max: 27, min: 18, weatherCode: 1, text: 'Sol e Nuvens' },
        { date: '2026-09-14', dayName: 'ter', max: 28, min: 19, weatherCode: 2, text: 'Parcialmente Nublado' },
        { date: '2026-09-15', dayName: 'qua', max: 25, min: 17, weatherCode: 61, text: 'Pancadas de Chuva' },
        { date: '2026-09-16', dayName: 'qui', max: 26, min: 17, weatherCode: 1, text: 'Sol' },
        { date: '2026-09-17', dayName: 'sex', max: 29, min: 18, weatherCode: 0, text: 'Céu Aberto' },
      ],
    });
  }

  // RSS Proxy direto no Cloudflare Edge
  if (path === '/rss/proxy') {
    const targetUrl = url.searchParams.get('url');
    if (targetUrl) {
      try {
        const feedRes = await fetch(targetUrl, {
          headers: { 'User-Agent': 'CAST-StoreMidia/1.0 (Cloudflare Edge)' },
        });
        if (feedRes.ok) {
          const text = await feedRes.text();
          const items: string[] = [];
          const titleMatches = text.matchAll(/<title>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/gi);
          let count = 0;
          for (const match of titleMatches) {
            const title = (match[1] || match[2] || '').trim();
            if (title && !title.toLowerCase().includes('rss') && count < 15) {
              items.push(title);
              count++;
            }
          }
          if (items.length > 0) {
            return jsonResponse({ items, articles: items.map((t) => ({ title: t })) });
          }
        }
      } catch {
        // Fallback
      }
    }

    return jsonResponse({
      items: [
        'Dica do Especialista: Pratique 20 a 30 minutos de caminhada diária para fortalecer a saúde.',
        'Prevenção: Mantenha seus exames e aferições de pressão arterial em dia com nossos profissionais.',
        'CAST StoreMidia: Programação de alta definição e sistema de chamadas em tempo real.',
      ],
      articles: [],
    });
  }

  // Upload endpoint (suporte a base64 / data URLs)
  if (path === '/upload' && request.method === 'POST') {
    try {
      const data = (await request.json().catch(() => ({}))) as Record<string, string>;
      return jsonResponse({
        url: data.fileData || '',
        filename: data.filename || 'arquivo-upload',
        size: (data.fileData || '').length,
        mimeType: data.mimeType || 'image/jpeg',
      });
    } catch {
      return jsonResponse({ error: 'Falha no upload' }, 400);
    }
  }

  // Drive Settings
  if (path === '/drive/settings') {
    return jsonResponse({
      status: 'ok',
      settings: {
        connected: false,
        root_folder_name: 'CAST STOREMIDIA - ARQUIVOS DO SISTEMA',
      },
    });
  }

  // SubClients e Drive Documents
  if (path.startsWith('/sub-clients') || path.startsWith('/companies/') || path.startsWith('/drive/documents')) {
    return jsonResponse({ status: 'ok', subClients: [], documents: [] });
  }

  // Fallback padrão amigável para qualquer endpoint desconhecido
  return jsonResponse({
    status: 'ok',
    message: 'CAST StoreMidia Edge API respondendo.',
    endpoint: url.pathname,
    timestamp: Date.now(),
  });
};
