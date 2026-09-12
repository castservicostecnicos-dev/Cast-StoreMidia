/**
 * Cloudflare Pages Function
 * Intercepta chamadas em /api/* quando o app é publicado no Cloudflare Pages.
 *
 * Se você configurar a variável de ambiente `BACKEND_URL` no painel do Cloudflare Pages
 * (ex: https://seu-backend.onrender.com ou Google Cloud Run), este manipulador
 * atuará como um proxy reverso transparente no Edge, encaminhando requisições, headers e corpo.
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

  // 1. Se BACKEND_URL estiver configurado no Cloudflare Pages, faz proxy transparente
  if (env.BACKEND_URL && typeof env.BACKEND_URL === 'string') {
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
        // Sem corpo ou corpo já consumido
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
      return new Response(
        JSON.stringify({
          error: 'Falha ao conectar ao servidor backend via Cloudflare Pages proxy.',
          target: backendTarget,
          details: message,
        }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  }

  // 2. Health check embutido no Cloudflare Edge
  if (url.pathname === '/api/health') {
    return new Response(
      JSON.stringify({
        status: 'ok',
        service: 'CAST StoreMidia (Cloudflare Edge Pages)',
        timestamp: Date.now(),
        message: 'Cloudflare Pages Functions operando com sucesso.',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // 3. Resposta explicativa caso o backend ainda não tenha sido conectado
  return new Response(
    JSON.stringify({
      error: 'Backend não configurado no Cloudflare Pages.',
      message:
        'Para conectar o backend, defina a variável BACKEND_URL no painel do Cloudflare Pages (Settings > Environment Variables) apontando para o seu servidor backend, ou defina VITE_API_URL antes do build.',
      endpoint: url.pathname,
      timestamp: Date.now(),
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
};
