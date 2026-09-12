import React, { useState } from 'react';
import {
  Tv,
  Smartphone,
  CheckCircle2,
  Copy,
  ExternalLink,
  Download,
  Power,
  Sliders,
  ShieldCheck,
  Maximize,
  HelpCircle,
  X,
  Play,
  Share2,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidBoxSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerCode?: string;
  playerToken?: string;
  playerName?: string;
}

export const AndroidBoxSetupModal: React.FC<AndroidBoxSetupModalProps> = ({
  isOpen,
  onClose,
  playerCode = '',
  playerToken = '',
  playerName = 'Player de TV',
}) => {
  const [activeTab, setActiveTab] = useState<'install' | 'autoboot' | 'kiosk' | 'tips'>('install');
  const [copied, setCopied] = useState(false);
  const { isInstallable, isInstalled, install } = usePWAInstall();

  if (!isOpen) return null;

  const origin = window.location.origin;
  const directLink = `${origin}/?player=${encodeURIComponent(playerCode)}${
    playerToken ? `&token=${encodeURIComponent(playerToken)}` : ''
  }`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(directLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600/20 p-2.5 text-blue-400 border border-blue-500/30">
              <Tv className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Configurar TV Box Android & PWA</span>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  Tela Cheia + Auto-Start
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Guia para instalar e fazer o player rodar automaticamente ao ligar o aparelho.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Link do Player Box */}
        <div className="bg-slate-950/60 px-6 py-3 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="text-xs truncate max-w-md">
            <span className="text-slate-400 font-semibold mr-1">Link Único:</span>
            <code className="text-blue-300 font-mono select-all text-[11px] bg-blue-950/40 px-2 py-1 rounded border border-blue-900/60">
              {directLink}
            </code>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyLink}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
            </button>
            <a
              href={directLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 px-2.5 py-1.5 text-xs font-semibold"
              title="Testar Player em Nova Aba"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('install')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'install'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="h-4 w-4" />
            <span>1. Instalar PWA (Tela Cheia)</span>
          </button>
          <button
            onClick={() => setActiveTab('autoboot')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'autoboot'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Power className="h-4 w-4" />
            <span>2. Iniciar ao Ligar a Box</span>
          </button>
          <button
            onClick={() => setActiveTab('kiosk')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'kiosk'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Modo Kiosk (Fully Kiosk)</span>
          </button>
          <button
            onClick={() => setActiveTab('tips')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'tips'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Dicas 24/7 (Sem Dormir)</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: PWA Installation */}
          {activeTab === 'install' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-4 text-xs text-blue-200 flex items-start gap-3">
                <Maximize className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-sm">O que acontece ao instalar como PWA?</h4>
                  <p className="mt-1 leading-relaxed text-slate-300">
                    O aplicativo passa a se comportar como um aplicativo nativo do Android. Ele cria um ícone
                    no menu principal da TV Box e roda em <strong>modo de tela cheia absoluta (fullscreen)</strong>,
                    sem barra de endereços do Chrome e sem botões do sistema.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Passo a Passo na TV Box Android:
                </h4>

                <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    1
                  </div>
                  <div className="text-xs text-slate-300">
                    <p className="font-semibold text-white">Abra o navegador Chrome na TV Box</p>
                    <p className="text-slate-400 mt-0.5">
                      Cole ou digite o Link Único do player fornecido acima. O player começará a rodar.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    2
                  </div>
                  <div className="text-xs text-slate-300">
                    <p className="font-semibold text-white">Toque em "Instalar Aplicativo"</p>
                    <p className="text-slate-400 mt-0.5">
                      No canto superior ou no menu de 3 pontos do Chrome, clique em{' '}
                      <strong className="text-white">"Instalar aplicativo"</strong> ou{' '}
                      <strong className="text-white">"Adicionar à tela inicial"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                    3
                  </div>
                  <div className="text-xs text-slate-300">
                    <p className="font-semibold text-white">Pronto! Ícone criado na TV Box</p>
                    <p className="text-slate-400 mt-0.5">
                      Um aplicativo chamado <strong>"CAST StoreMidia"</strong> estará na lista de apps da TV Box. Ao clicar nele, ele já abre direto reproduzindo a programação em tela cheia!
                    </p>
                  </div>
                </div>
              </div>

              {isInstallable && (
                <div className="pt-2">
                  <button
                    onClick={install}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg hover:from-blue-500 hover:to-indigo-500 transition cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Instalar Aplicativo Neste Navegador Agora</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Auto-Start on Boot */}
          {activeTab === 'autoboot' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 text-xs text-emerald-200 flex items-start gap-3">
                <Power className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-sm">Como funciona o Auto-Start no Android?</h4>
                  <p className="mt-1 leading-relaxed text-slate-300">
                    Nenhum navegador do mundo pode ligar a si mesmo por segurança do Android. Mas há aplicativos gratuitos
                    muito leves na Google Play Store feitos especificamente para abrir o aplicativo na inicialização da box.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    Método Gratuito: App "Launch on Boot" (Play Store)
                  </span>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                    Recomendado
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex gap-2">
                    <span className="text-emerald-400 font-bold">1.</span>
                    <span>Abra a Play Store na TV Box e pesquise por <strong>"Launch on Boot"</strong> (ou <strong>"AutoStart - No root"</strong>).</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-400 font-bold">2.</span>
                    <span>Abra o app e ative a opção <strong>"Enable" (Habilitar)</strong>.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-400 font-bold">3.</span>
                    <span>Clique em <strong>"Select App"</strong> e selecione o aplicativo <strong>"CAST StoreMidia"</strong> que você instalou no Passo 1 (ou o Chrome).</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-400 font-bold">4.</span>
                    <span>(Opcional) Defina um atraso de <strong>5 a 10 segundos</strong> para dar tempo do Wi-Fi conectar antes de abrir o player.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-400 font-bold">5.</span>
                    <span><strong>Teste:</strong> Reinicie a TV Box. Assim que o Android carregar, o player abrirá automaticamente rodando os vídeos!</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 text-xs text-slate-400">
                <p className="font-semibold text-slate-300">Outra opção simples: Configurar como "App de Início" (Launcher)</p>
                <p className="mt-1">
                  Nas <strong>Configurações do Android &gt; Apps padrão &gt; App de Início (Home App)</strong>, algumas TV Boxes permitem selecionar o PWA instalado como o Launcher padrão da TV. Assim, a própria tela inicial da TV Box é o player!
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Fully Kiosk */}
          {activeTab === 'kiosk' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-purple-900/40 bg-purple-950/20 p-4 text-xs text-purple-200 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-sm">Fully Kiosk Browser (Padrão Comercial)</h4>
                  <p className="mt-1 leading-relaxed text-slate-300">
                    Usado por 90% das empresas profissionais de Mídia Indoor e Digital Signage em totens e TV Boxes Android.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <p className="font-bold text-white">Por que o Fully Kiosk é excelente?</p>
                  <ul className="list-disc list-inside mt-1.5 space-y-1 text-slate-300 text-[11px]">
                    <li>Inicia automaticamente ao ligar o aparelho (Auto-start integrado).</li>
                    <li>Bloqueia a tela cheia e impede que clientes fechem o aplicativo.</li>
                    <li>Reinicia o player automaticamente em caso de queda de energia ou erro.</li>
                    <li>Mantém a tela sempre acesa (impede sleep mode).</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-white">Como configurar no Fully Kiosk em 2 minutos:</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px]">
                    <li>Baixe o <strong>Fully Kiosk Browser</strong> na Play Store da TV Box ou no site oficial (fully-kiosk.com).</li>
                    <li>No menu do Fully Kiosk, vá em <strong>Web Browsing &gt; Start URL</strong> e cole o Link Único do Player:</li>
                    <div className="my-1 pl-4">
                      <code className="text-[10px] text-blue-300 bg-slate-950 px-2 py-1 rounded border border-slate-800 block truncate">
                        {directLink}
                      </code>
                    </div>
                    <li>Em <strong>Device Management</strong>, ative <strong>"Run on Boot"</strong> (Iniciar ao ligar).</li>
                    <li>Em <strong>Display</strong>, ative <strong>"Keep Screen On"</strong> (Manter tela acesa).</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 24/7 Tips */}
          {activeTab === 'tips' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 text-xs text-amber-200 flex items-start gap-3">
                <Sliders className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-sm">Configurações para a TV não desligar nem hibernar</h4>
                  <p className="mt-1 leading-relaxed text-slate-300">
                    O nosso reprodutor já possui embutido o <strong>Screen Wake Lock API</strong> que envia comandos para o sistema nunca apagar a tela enquanto estiver exibindo mídias.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <p className="font-bold text-white">1. Protetor de Tela da TV Box</p>
                  <p className="text-slate-400 mt-0.5">
                    Vá em <strong>Configurações do Android &gt; Preferências do dispositivo &gt; Protetor de tela</strong> e selecione <strong>"Nunca"</strong> ou <strong>"Desativado"</strong>.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <p className="font-bold text-white">2. Modo de Espera / Economia de Energia</p>
                  <p className="text-slate-400 mt-0.5">
                    Em <strong>Opções do desenvolvedor</strong> do Android, ative a chave <strong>"Permanecer ativo"</strong> (A tela nunca entra em suspensão durante o carregamento/energia).
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <p className="font-bold text-white">3. Controle Remoto da TV Box</p>
                  <p className="text-slate-400 mt-0.5">
                    No reprodutor, você pode pressionar a tecla <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px]">OK</kbd> ou dar um toque duplo em qualquer parte da tela para alternar entre tela cheia.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-6 py-3.5 bg-slate-950 flex items-center justify-between rounded-b-2xl">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Tv className="h-4 w-4 text-blue-400" />
            <span>Player: <strong className="text-white">{playerName}</strong> ({playerCode})</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
