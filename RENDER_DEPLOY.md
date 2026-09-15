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

### Notas sobre Armazenamento e Uploads:
- O sistema armazena os dados em `data/indoor_media.json` e arquivos enviados em `uploads/`.
- No plano gratuito do Render, o sistema de arquivos reinicia a cada novo deploy. As contas e planos padrão são recriados automaticamente na primeira inicialização.
- Para manter fotos e mídias salvas permanentemente mesmo após novos deploys no Render, você pode opcionalmente adicionar um **Disk** (Persistent Disk) apontando para `/uploads` e `/data` nas configurações do serviço.
