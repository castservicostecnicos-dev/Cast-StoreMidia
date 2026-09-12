# Guia: Configuração do Player na TV Box Android (CAST StoreMidia PWA + Tela Cheia + Auto-Start)

Este guia explica como transformar qualquer **TV Box Android, Smart TV Android ou Mini PC** em um terminal CAST StoreMidia profissional de alto desempenho com:
1. **Instalação como PWA (Progressive Web App)** rodando em **Tela Cheia Imersiva** (sem barra de URL do navegador ou botões do sistema).
2. **Inicialização Automática ao Ligar o Aparelho (Auto-Start on Boot)**: a box liga na tomada e o reprodutor de mídia abre sozinho, sem intervenção humana.
3. **Screen Wake Lock integrado**: a tela nunca apaga, não entra em modo de espera nem liga protetor de tela.
4. **Cache Offline**: se a internet cair, a programação continua rodando normalmente.

---

## Passo 1: Como Instalar o PWA na TV Box Android

1. Ligue a TV Box e conecte à internet (Wi-Fi ou cabo de rede).
2. Abra o navegador **Google Chrome** (ou Chromium) na TV Box.
3. Acesse a **URL Única do seu Player** (gerada no painel da empresa):
   ```text
   https://seu-dominio.pages.dev/?player=CODIGO&token=TOKEN
   ```
4. O player carregará a programação imediatamente.
5. No canto superior direito da tela do player (ou no menu de **3 pontinhos** do Chrome), clique em:
   - **"Instalar Aplicativo"** (ou **"Adicionar à tela inicial"**).
6. Confirme a instalação.
7. **Resultado:** Um ícone com o nome **"CAST StoreMidia"** aparecerá na gaveta de aplicativos da TV Box. Ao abrir por esse ícone, ele roda nativamente em tela cheia total.

---

## Passo 2: Como Fazer o App Abrir Automaticamente ao Ligar a TV Box

Nenhum navegador ou site da web possui permissão do sistema operacional Android para iniciar a si mesmo após a inicialização por questões de segurança. Por isso, usamos uma ferramenta utilitária leve do Android para disparar o aplicativo assim que o sistema ligar.

### Opção A (Recomendada e Gratuita): App "Launch on Boot"

1. Na TV Box, abra a **Google Play Store** (ou instale o APK via pendrive).
2. Pesquise e instale o app **"Launch on Boot"** (ou **"AutoStart - No root"**).
3. Abra o **Launch on Boot**:
   - Ative a chave **"Enable"** (Habilitar).
   - Clique em **"Select App"**.
   - Na lista de aplicativos, escolha o **"CAST StoreMidia"** (o PWA instalado no Passo 1) ou o Chrome.
   - (Recomendado) Configure um atraso de **5 a 10 segundos** em *Boot delay* (para dar tempo da TV Box conectar ao Wi-Fi antes de abrir).
4. **Teste:** Desligue a TV Box da tomada e ligue novamente.
   - Assim que o Android terminar de inicializar, o reprodutor abrirá sozinho em tela cheia!

---

### Opção B (Padrão Profissional Digital Signage): Fully Kiosk Browser

O **Fully Kiosk Browser** é o software mais utilizado mundialmente por empresas de mídia indoor para totens e telas públicas.

1. Baixe o **Fully Kiosk Browser** na Play Store da TV Box ou pelo site oficial [fully-kiosk.com](https://www.fully-kiosk.com/).
2. Abra o Fully Kiosk e configure:
   - **Web Browsing > Start URL**: cole a URL Única do Player (`https://seu-dominio.pages.dev/?player=CODIGO&token=TOKEN`).
   - **Device Management > Run on Boot**: marque como **Ativado**.
   - **Display > Keep Screen On**: marque como **Ativado**.
   - **Kiosk Mode (opcional)**: bloqueia o controle remoto para ninguém conseguir sair do player ou mexer nas configurações da TV Box.
3. Ao ligar a TV Box, o Fully Kiosk abre instantaneamente em tela cheia sem qualquer borda.

---

## Passo 3: Configurações Recomendadas na TV Box (Operação 24/7)

Para garantir que a TV Box funcione ininterruptamente sem desligar:

1. **Desativar Protetor de Tela:**
   - Acesse **Configurações do Android > Preferências do dispositivo > Protetor de tela**.
   - Defina como **"Desativado"** ou **"Nunca"**.
2. **Impedir Suspensão de Energia (Sleep Mode):**
   - Acesse **Configurações > Opções do desenvolvedor**.
   - Ative a opção **"Permanecer ativo"** (a tela nunca entra em suspensão enquanto estiver conectada à energia).
3. **Controle Remoto:**
   - Durante a reprodução, você pode dar um **toque duplo na tela** ou pressionar a tecla **F** ou **Enter/OK** no controle remoto para alternar tela cheia.
