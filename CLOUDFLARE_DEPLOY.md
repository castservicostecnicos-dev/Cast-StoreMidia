# 🚀 Guia de Publicação no Cloudflare (Pages & Workers) com GitHub

Este projeto já está **100% preparado e configurado** para sincronização com o **GitHub** e publicação instantânea no **Cloudflare**.

---

## 🏆 Qual escolher: Cloudflare Pages ou Cloudflare Workers?

| Recurso | **Cloudflare Pages** (⭐ Recomendado) | **Cloudflare Workers** |
| :--- | :--- | :--- |
| **Integração com GitHub** | **Nativa com 1 clique** (deploys automáticos a cada `git push`) | Requer GitHub Actions ou CLI |
| **Arquitetura** | Frontend SPA (Vite + React) com CDN global e Edge Functions | Workers Serverless com assets estáticos |
| **Roteamento SPA** | Automático via `_redirects` (`/* /index.html 200`) | Configurado via `wrangler.jsonc` |
| **Deploy sem terminal** | Sim, direto pelo painel do Cloudflare | Não (requer Wrangler CLI ou Actions) |
| **Facilidade de Uso** | **Extremamente simples** | Nível intermediário |

> **Importante: Você NÃO precisa de Secrets ou Tokens!**
> Com o **Cloudflare Pages conectado ao GitHub**, a Cloudflare faz a sincronização e os deploys de forma nativa e automática. Você não precisa configurar nenhum token, secret ou chave no GitHub.

---

## 📦 Passo 1: Sincronizar o projeto com o GitHub

### Se estiver usando o Google AI Studio:
1. No menu superior ou de configurações do AI Studio, clique em **Export** (ou **Share** / **Settings**).
2. Escolha **Export to GitHub** (ou baixe o arquivo ZIP).
3. Se baixou o ZIP, descompacte e envie para o seu GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: projeto midia indoor preparado para cloudflare"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```

---

## 🌐 Passo 2: Publicar no Cloudflare Pages (Método Recomendado)

1. Acesse o [Painel da Cloudflare (dash.cloudflare.com)](https://dash.cloudflare.com).
2. No menu lateral esquerdo, clique em **Compute (Workers & Pages)** > **Create application**.
3. Selecione a aba **Pages** e clique em **Connect to Git** (Conectar ao Git).
4. Conecte sua conta do GitHub e selecione o repositório do app.
5. Na tela de configuração de build, preencha:
   - **Project name**: `cast-storemidia` (ou o nome que preferir)
   - **Production branch**: `main` (ou `master`)
   - **Framework preset**: Selecione `Vite` (ou `None`)
   - **Build command**: `npm run build:pages` *(ou `npm run build`)*
   - **Build output directory**: `dist`
   - **Root directory**: Deixe em branco (raiz)
6. Em **Environment variables (advanced)**, adicione:
   - `NODE_VERSION` = `20`
   - *(Opcional)* `VITE_API_URL` = URL do seu servidor backend (se estiver em outro serviço, ex: `https://meu-backend.onrender.com` ou Cloud Run)
   - *(Opcional)* `BACKEND_URL` = URL do backend para o proxy transparente do Cloudflare Functions (`functions/api/[[route]].ts`)
7. Clique em **Save and Deploy**.
8. Pronto! Em cerca de 1 minuto seu aplicativo estará publicado e acessível no endereço gratuito `https://cast-storemidia.pages.dev`.

---

## ⚡ Passo 3: Opção Alternativa - Deploy via Cloudflare Workers (Wrangler CLI)

Se você preferir publicar via linha de comando no Cloudflare Workers:

1. Faça o build dos arquivos estáticos:
   ```bash
   npm run build:pages
   ```
2. Faça o login na Cloudflare:
   ```bash
   npx wrangler login
   ```
3. Publique o Worker:
   ```bash
   npm run deploy:worker
   # ou: npx wrangler deploy
   ```
O projeto já conta com o arquivo `wrangler.jsonc` e `wrangler.toml` configurados com `not_found_handling: "single-page-application"`.

---

## 🛠️ Arquivos já preparados no projeto:

- `public/_redirects`: Garante que URLs diretas como `/?player=CODE&token=TOKEN` ou qualquer outra rota funcionem sem erro 404 (SPA fallback).
- `public/_headers`: Configura políticas de cache para mídias, cabeçalhos de segurança e service workers (PWA).
- `public/_routes.json`: Otimiza a CDN do Cloudflare para servir arquivos estáticos direto da borda.
- `functions/api/[[route]].ts`: Edge Function do Cloudflare Pages que realiza proxy reverso inteligente para chamadas de API caso configurado `BACKEND_URL`.
- `wrangler.jsonc` e `wrangler.toml`: Configuração para deploys com Cloudflare Workers.
- `src/lib/api.ts`: Suporta a variável de ambiente `VITE_API_URL` para comunicação flexível com o backend.
