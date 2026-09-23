# Como Publicar o Mídia Indoor no Render (render.com)

Este projeto já está **100% preparado e testado** para rodar no Render como um **Web Service** Node.js.

---

### Opção 1: Implantação Automática via Blueprint (`render.yaml`)
1. Envie este repositório para o seu **GitHub** ou **GitLab**.
2. No painel do [Render](https://dashboard.render.com/):
   - Clique em **New +** e selecione **Blueprint**.
   - Conecte o repositório deste projeto.
   - O Render lerá automaticamente o arquivo `render.yaml` já configurado na raiz.
   - Clique em **Apply** e o deploy iniciará automaticamente!

---

### Opção 2: Implantação Manual (Web Service)
Se preferir criar o serviço manualmente no Render:
1. No painel do Render, clique em **New +** -> **Web Service**.
2. Conecte o seu repositório Git.
3. Configure os seguintes campos:
   - **Name:** `midia-indoor` (ou o nome que preferir)
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free` (ou superior)
4. Na seção **Environment Variables** (Variáveis de Ambiente), adicione:
   - `PORT` = `3000` *(Importante: o servidor está configurado para a porta 3000)*
   - `NODE_ENV` = `production`
5. Na seção **Health Check Path** (Opcional, em Advanced):
   - `/api/health`
6. Clique em **Create Web Service**.

---

### Persistência de Dados e Banco de Dados (Firebase Firestore):
- **O Banco de Dados é 100% persistente na nuvem**: Todas as empresas, usuários, operadores, senhas, telas (players), playlists e programações são sincronizados automaticamente em tempo real com o **Firebase Firestore**.
- **Segurança contra novos deploys e reinicializações**: O arquivo `firebase-applet-config.json` já está incluído na raiz do projeto. Mesmo que o Render durma ou seja feito um novo deploy (que limpa o disco temporário do plano Free), ao inicializar o servidor restaura automaticamente todos os dados salvos do Firestore!
- **Variáveis de Ambiente (Opcional caso não queira subir o json para o git público)**:
  - Se preferir adicionar via variáveis de ambiente no painel do Render, você pode definir:
    - `FIREBASE_PROJECT_ID`: `gen-lang-client-0937994667`
    - `FIREBASE_API_KEY`: sua chave de API do Firebase
    - `FIRESTORE_DATABASE_ID`: `ai-studio-mdiaindoor-0ee6f26d-4225-42ad-910a-5d51615f2900`
---

### Web Service vs. Static Site no Render (Dúvida Frequente):
- **O app pode rodar como um "Static Site" puro (sem backend)?**
  - **NÃO como um serviço isolado**. Um "Static Site" serve apenas arquivos HTML/JS/CSS estáticos e **não executa Node.js**.
  - Este aplicativo necessita do servidor Node.js/Express (`server.ts`) para processar as rotas de API vitais:
    1. **Autenticação**: login com validação de senhas com hash e controle de sessões.
    2. **Monitoramento e Heartbeat dos Players**: comunicação contínua das TVs com o servidor.
    3. **Tempo Real (SSE)**: chamada de senhas pelos operadores transmitida instantaneamente para a TV.
    4. **Sincronização com o Firestore**: gestão de dados, planos, cotas e feeds RSS.
    5. **Uploads de Mídia Locais**: recebimento e armazenamento de arquivos no servidor.
  - Portanto, alterar o tipo de serviço no Render para "Static Site" sem um backend causará erros `404 Not Found` em todas as ações do sistema.

- **É possível usar a arquitetura híbrida (Frontend em Static Site + Backend em Web Service)?**
  - **SIM!** O código já foi preparado para isso:
    - O backend possui suporte completo a **CORS** ativado para qualquer origem.
    - O frontend aceita a variável `VITE_API_BASE_URL` para apontar para o seu Web Service Node.js (ex: `https://meu-backend.onrender.com/api`).
    - Assim, se você criar um **Static Site** no Render apenas para o frontend, basta configurar a variável de ambiente `VITE_API_BASE_URL` nele apontando para a URL do seu **Web Service** de backend!
  - **Recomendação mais simples:** Manter como **Web Service** unificado (Opção 1 ou 2 acima), onde frontend e backend rodam juntos no mesmo serviço sem custo adicional nem necessidade de gerenciar dois serviços.
