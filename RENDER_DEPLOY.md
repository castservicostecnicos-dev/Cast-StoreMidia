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
- **Mídias e Arquivos**: As mídias podem ser vinculadas diretamente pelo **Google Drive** de cada empresa (armazena os vídeos e imagens no Google Drive sem consumir disco do Render) ou via uploads locais. Caso utilize uploads locais no plano gratuito do Render, recomenda-se adicionar um **Persistent Disk** para a pasta `/uploads`.
