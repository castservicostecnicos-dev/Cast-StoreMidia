# 🚀 Guia de Publicação no Cloudflare (Pages & Workers) com GitHub

Este projeto está **100% preparado e configurado** para publicação no **Cloudflare Pages** ou **Cloudflare Workers**, operando em **Modo Autônomo Edge** (sem necessidade obrigatória de servidor externo) ou em **Modo Integrado** (com servidor Node.js dedicado).

---

## 💡 Entendendo o funcionamento após a publicação

O CAST StoreMidia possui **dois modos de operação**:

### 1. 🌟 Modo Autônomo Edge (Recomendado - Zero Custos e Zero Configuração)
- O aplicativo roda **100% no Cloudflare Pages** utilizando **Cloudflare Pages Functions** na borda (Edge).
- **Não requer servidor backend externo** (Render, VPS ou Docker).
- Autenticação, controle de players (horizontal e vertical), playlists com mídias, previsão do tempo ao vivo (Open-Meteo), RSS e chamadas de senha de guichê funcionam instantaneamente.
- Em caso de hospedagem estática pura (como GitHub Pages) ou perda momentânea de conexão, o sistema ativa automaticamente o **Mecanismo LocalStore PWA**, persistindo dados no navegador e sincronizando abas em tempo real via `BroadcastChannel`.

### 2. 🏢 Modo com Servidor Backend Dedicado (Opcional - Multilojas em Redes Distintas)
- Se você quiser um servidor centralizado Node.js/Express (com banco de dados único gravado em disco) para gerenciar centenas de telas em diferentes cidades:
  1. Suba o projeto no [Render.com](https://render.com) ou [Railway.app](https://railway.app) como *Web Service* (comando de build: `npm run build`, comando de start: `npm start`).
  2. No painel do **Cloudflare Pages**, acesse: **Settings** > **Environment variables** e adicione a variável:
     - `BACKEND_URL` = `https://seu-servidor-backend.onrender.com`
  3. O Cloudflare Pages atuará como proxy reverso de alto desempenho para o seu servidor.

---

## 🌐 Passo a Passo: Publicação no Cloudflare Pages

1. Acesse o [Painel da Cloudflare (dash.cloudflare.com)](https://dash.cloudflare.com).
2. No menu lateral, clique em **Compute (Workers & Pages)** > **Create application** > aba **Pages**.
3. Clique em **Connect to Git** e selecione o repositório do seu GitHub.
4. Preencha os campos de configuração da build:
   - **Framework preset**: `Vite` (ou `None`)
   - **Build command**: `npm run build:pages` *(ou `npm run build`)*
   - **Build output directory**: `dist`
   - **Root directory**: Deixe em branco
5. Em **Environment variables (advanced)**, adicione:
   - `NODE_VERSION` = `20`
   - *(Opcional)* `BACKEND_URL` = URL do seu servidor backend se optar pelo Modo 2. Se deixar sem, funcionará automaticamente no **Modo Autônomo Edge**.
6. Clique em **Save and Deploy**.
7. Pronto! O aplicativo será gerado e estará no ar com HTTPS gratuito em `https://seu-app.pages.dev`.

---

## 🔑 Contas de Acesso Pré-Configuradas

Ao abrir o app publicado, você pode entrar imediatamente com:

| Perfil | E-mail / Código | Senha |
| :--- | :--- | :--- |
| **Administrador** | `admin@cast.com` ou `ale11062@gmail.com` | `123456` ou `Admin@123456` |
| **Empresa (Gestor)** | `empresa@cast.com` | `123456` |
| **Operador (Chamador de Senha)** | `operador@cast.com` | `123456` |
| **Player TV (Horizontal)** | Aba *Código do Player*: `TV-1001` | Sem senha necessária |
| **Totem Vertical (9:16)** | Aba *Código do Player*: `TV-1002` | Sem senha necessária |

---

## 🛠️ Arquivos de Infraestrutura Prontos:

- `functions/api/[[route]].ts`: Roteador Edge do Cloudflare Pages com modo autônomo e proxy reverso inteligente.
- `public/_redirects`: Regra de fallback SPA para navegação direta e parâmetros de URL (`/?player=CODE&token=TOKEN`).
- `public/_headers`: Políticas de cache para mídias, cabeçalhos de segurança e service workers PWA.
- `public/_routes.json`: Roteamento CDN otimizado na borda.
- `src/lib/api.ts`: Cliente de API resiliente com fallback local transparente.
- `src/lib/localStore.ts` & `src/lib/localApiFallback.ts`: Mecanismo autônomo offline-first com sincronização multi-abas em tempo real.
