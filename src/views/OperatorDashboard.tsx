import React, { useState, useEffect, useRef } from 'react';
import {
  BellRing,
  Send,
  Clock,
  Sparkles,
  CheckCircle2,
  Monitor,
  Star,
  Pin,
  RefreshCw,
  RotateCcw,
  Activity,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Keyboard,
} from 'lucide-react';
import { api } from '../lib/api';
import { PlayerDiagnosticView, DiagnosticPlayerData } from '../components/PlayerDiagnosticView';

interface OperatorDashboardProps {
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onOpenPlayerSimulation?: (code: string) => void;
}

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({
  showToast,
  onOpenPlayerSimulation,
}) => {
  // Aba ativa: 'calls' (prioridade máxima, na primeira posição) ou 'diagnostic'
  const [activeTab, setActiveTab] = useState<'calls' | 'diagnostic'>('calls');

  const [players, setPlayers] = useState<DiagnosticPlayerData[]>([]);

  // Persistent Player selection via localStorage
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(() => {
    try {
      return localStorage.getItem('indoor_op_player_id') || '';
    } catch {
      return '';
    }
  });

  // Target for deep diagnosis
  const [diagnosticPlayerId, setDiagnosticPlayerId] = useState<string>('');

  // Persistent Phrase: Fixed in the input field, only altered when the operator types/edits it
  const [callText, setCallText] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('indoor_op_call_text') ||
        'Favor comparecer ao atendimento'
      );
    } catch {
      return 'Favor comparecer ao atendimento';
    }
  });

  const [isPriority, setIsPriority] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(10);
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [lastCallDelivered, setLastCallDelivered] = useState<boolean | null>(null);
  const [lastCallTime, setLastCallTime] = useState<string | null>(null);

  // Sync fixed phrase and chosen player persistently in localStorage
  useEffect(() => {
    try {
      if (callText !== undefined) {
        localStorage.setItem('indoor_op_call_text', callText);
      }
      if (selectedPlayerId) {
        localStorage.setItem('indoor_op_player_id', selectedPlayerId);
      }
    } catch {}
  }, [callText, selectedPlayerId]);

  const loadData = async () => {
    try {
      const res = await api.getOperatorDashboard();
      setPlayers(res.players);
      if (res.players.length > 0 && !selectedPlayerId) {
        setSelectedPlayerId(res.players[0].id);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao carregar dados do operador.');
    }
  };

  useEffect(() => {
    loadData();
    // Poll player status every 10s
    const interval = setInterval(() => {
      api.getOperatorDashboard()
        .then((res) => {
          setPlayers(res.players);
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerCall = async (overridePriority?: boolean) => {
    if (!selectedPlayerId) {
      showToast('error', 'Selecione um player de exibição.');
      return;
    }
    if (!callText.trim()) {
      showToast('error', 'Digite a frase de chamada.');
      return;
    }

    const priorityToSend = overridePriority !== undefined ? overridePriority : isPriority;
    setIsCalling(true);
    try {
      const res = await api.triggerCall({
        playerId: selectedPlayerId,
        phrase: callText.trim(),
        duration,
        isPriority: priorityToSend,
      });

      // Synchronize immediately with all open tabs and windows in the browser
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('indoor_media_calls');
          bc.postMessage({ type: 'CALL_EVENT', call: res.call });
          bc.close();
        }
      } catch {}

      try {
        localStorage.setItem(
          'indoor_last_call',
          JSON.stringify({ call: res.call, timestamp: Date.now() })
        );
      } catch {}

      setLastCallDelivered(res.delivered);
      const nowStr = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastCallTime(nowStr);

      showToast(
        'success',
        priorityToSend
          ? 'Chamada PREFERENCIAL enviada com sucesso! A frase continua fixa no campo.'
          : res.message || 'Chamada enviada com sucesso! A frase continua fixa no campo.'
      );
    } catch (err: any) {
      showToast('error', err.message || 'Falha ao enviar chamada.');
    } finally {
      setIsCalling(false);
    }
  };

  // Referência sempre atualizada da função de chamada para o listener global de teclado
  const triggerCallRef = useRef(handleTriggerCall);
  useEffect(() => {
    triggerCallRef.current = handleTriggerCall;
  });

  // Atalho de Teclado Global: [N] para Chamada Normal e [P] para Chamada Preferencial
  // Funciona quando o foco estiver FORA do campo de edição de texto (textarea/input)
  useEffect(() => {
    if (activeTab !== 'calls') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;

      // Se o operador estiver digitando em um input, textarea, select ou contenteditable, ignora
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Ignora atalhos de sistema com Ctrl, Alt ou Meta/Command (ex: Ctrl+P de impressão, Ctrl+N de nova janela)
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        triggerCallRef.current(false);
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        triggerCallRef.current(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab]);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);
  const activeDiagnosticPlayer =
    players.find((p) => p.id === (diagnosticPlayerId || selectedPlayerId)) ||
    selectedPlayer ||
    players[0];

  const onlinePlayersCount = players.filter((p) => p.is_online).length;
  const offlinePlayersCount = players.length - onlinePlayersCount;

  const handleOpenDiagnosticForPlayer = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setDiagnosticPlayerId(playerId);
    setActiveTab('diagnostic');
  };

  const getPlayerQuickElapsed = (lastSeen: string) => {
    if (!lastSeen) return 'Sem sinal';
    const diffSec = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000);
    if (diffSec < 0) return 'Agora';
    if (diffSec < 60) return `${diffSec}s atrás`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m atrás`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr}h atrás`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {/* NAVEGAÇÃO POR ABAS: CHAMADAS (1ª POSIÇÃO) x DIAGNÓSTICO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700 pb-4 mb-6">
        {/* Abas */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
          {/* ABA 1: CHAMADAS (PRIMEIRA POSIÇÃO - FOCO TOTAL EM DISPARO) */}
          <button
            type="button"
            id="tab-operator-calls"
            onClick={() => setActiveTab('calls')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'calls'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BellRing className="h-4 w-4" />
            <span>Chamadas de Atendimento</span>
          </button>

          {/* ABA 2: DIAGNÓSTICO DOS PLAYERS (ISOLADO PARA NÃO POLUIR O ATENDIMENTO) */}
          <button
            type="button"
            id="tab-operator-diagnostic"
            onClick={() => setActiveTab('diagnostic')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'diagnostic'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Diagnóstico dos Players</span>
            {offlinePlayersCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black animate-pulse">
                {offlinePlayersCount} off
              </span>
            )}
          </button>
        </div>

        {/* Botão de Atualização Rápida */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={loadData}
            title="Atualizar status e conexões dos players"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold cursor-pointer transition shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONTEÚDO DA ABA 1: TERMINAL DE CHAMADAS (PRIORIDADE MÁXIMA & FRASE FIXA) */}
      {/* ========================================================================= */}
      {activeTab === 'calls' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Mini Alerta de Player Offline com Link para Aba de Diagnóstico */}
          {selectedPlayer && !selectedPlayer.is_online && (
            <div className="rounded-xl border border-rose-800/80 bg-rose-950/40 p-3 flex items-center justify-between gap-3 text-rose-200">
              <div className="flex items-center gap-2 text-xs">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>
                  O player <strong>{selectedPlayer.name} ({selectedPlayer.code})</strong> parece estar sem sinal recente.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenDiagnosticForPlayer(selectedPlayer.id)}
                className="shrink-0 text-xs font-bold text-rose-300 hover:text-white underline flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Diagnóstico</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* 1. SELEÇÃO RÁPIDA DO PLAYER DESTINO */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Monitor className="h-4 w-4 text-blue-400" />
                <span>1. Player Destino da Chamada</span>
              </label>

              {selectedPlayer && (
                <div className="flex items-center gap-3">
                  <a
                    href={`/?player=${encodeURIComponent(selectedPlayer.code)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 font-bold underline flex items-center gap-1 cursor-pointer"
                    title="Abre a tela da TV em nova aba para acompanhar as chamadas ao vivo"
                  >
                    Abrir TV ↗
                  </a>
                  {onOpenPlayerSimulation && (
                    <button
                      type="button"
                      onClick={() => onOpenPlayerSimulation(selectedPlayer.code)}
                      className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer hidden sm:inline"
                    >
                      (simular)
                    </button>
                  )}
                </div>
              )}
            </div>

            {players.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                Nenhum player cadastrado na sua empresa.
              </p>
            ) : players.length === 1 ? (
              /* Caso haja apenas 1 player: exibição compacta e direta */
              <div className="flex items-center justify-between p-3 rounded-lg border border-blue-500/60 bg-blue-950/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <span className="font-bold text-white text-sm">
                      {players[0].name}
                    </span>
                    <span className="ml-2 font-mono text-[10px] text-blue-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 font-bold">
                      {players[0].code}
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {players[0].location || 'Localização padrão'} • Sinal: {getPlayerQuickElapsed(players[0].last_seen)}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    players[0].is_online
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                  }`}
                >
                  {players[0].is_online ? 'Online' : 'Offline'}
                </span>
              </div>
            ) : (
              /* Caso haja múltiplos players: grid compacto de seleção */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {players.map((p) => {
                  const isSelected = p.id === selectedPlayerId;
                  const quickElapsed = getPlayerQuickElapsed(p.last_seen);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlayerId(p.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-950/50 ring-1 ring-blue-500 shadow-xs'
                          : 'border-slate-700/80 bg-slate-900/60 hover:bg-slate-900'
                      }`}
                    >
                      <div className="truncate pr-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs truncate">
                            {p.name}
                          </span>
                          <span className="font-mono text-[9px] text-blue-400 bg-slate-950 px-1 py-0.2 rounded border border-slate-800 font-bold">
                            {p.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {p.location || 'Sem local'}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          p.is_online
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            p.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                          }`}
                        />
                        {p.is_online ? 'Online' : 'Off'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. ESPAÇO CENTRAL: FRASE FIXA DO OPERADOR */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>2. Frase de Chamada</span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-950/90 border border-blue-700/80 px-2 py-0.5 text-[11px] font-bold text-blue-300">
                    <Pin className="h-3 w-3 text-blue-400" />
                    Frase Fixa
                  </span>
                  {callText && (
                    <button
                      type="button"
                      onClick={() => {
                        setCallText('');
                        try {
                          localStorage.removeItem('indoor_op_call_text');
                        } catch {}
                      }}
                      className="text-[11px] text-slate-400 hover:text-rose-400 underline cursor-pointer flex items-center gap-1"
                      title="Limpar o campo de texto para digitar uma nova frase"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              <textarea
                id="input-call-phrase"
                rows={3}
                value={callText}
                onChange={(e) => setCallText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleTriggerCall(false);
                  }
                }}
                placeholder="Digite aqui a frase da chamada (Ex: Favor comparecer ao consultório 02 / Senha P01)..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3.5 text-sm font-medium text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition shadow-inner"
              />

              <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                <p className="flex items-center gap-1 text-slate-300 font-medium">
                  <Pin className="h-3 w-3 text-blue-400 shrink-0" />
                  Esta frase fica gravada e pronta para novas chamadas.
                </p>
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline text-slate-500 text-[10px]">
                    Atalho: <strong>Ctrl + Enter</strong> para chamar
                  </span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    {callText.length} caracteres
                  </span>
                </div>
              </div>
            </div>

            {/* Fila / Atendimento Preferencial */}
            <div
              className={`rounded-xl border p-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isPriority
                  ? 'border-amber-500/80 bg-amber-950/40'
                  : 'border-amber-900/40 bg-amber-950/15'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5 sm:mt-0">
                  <Star className="h-4 w-4 fill-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
                    <span>Fila Preferencial</span>
                    {isPriority && (
                      <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                        Ativa
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-amber-300/80">
                    Exibe alerta dourado de Atendimento Prioritário na tela da TV
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPriority(!isPriority)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isPriority
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                      : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Star className={`h-3.5 w-3.5 ${isPriority ? 'fill-slate-950' : ''}`} />
                  <span>{isPriority ? 'PREFERENCIAL MARCADO' : 'Marcar Preferencial'}</span>
                </button>
              </div>
            </div>

            {/* Tempo de Duração na Tela */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-700/80 pt-3.5">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-xs font-medium">Tempo de exibição na tela:</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-700 self-start sm:self-auto">
                {[5, 10, 15, 20].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setDuration(sec)}
                    className={`min-h-[36px] px-3 py-1 rounded-md text-xs font-bold uppercase transition cursor-pointer ${
                      duration === sec
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. BOTÕES DE DISPARO RÁPIDO */}
          <div className="space-y-3">
            {/* Dica visual dos atalhos rápidos de teclado */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 shadow-inner">
              <div className="flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-blue-400 shrink-0" />
                <span className="font-semibold text-slate-300">
                  Atalhos de Teclado (fora da caixa de texto):
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-md text-blue-300">
                  <kbd className="font-bold text-white bg-slate-900 px-1 py-0.2 rounded border border-slate-600">N</kbd>
                  <span>Chamar Normal</span>
                </span>
                <span className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-md text-amber-300">
                  <kbd className="font-bold text-white bg-slate-900 px-1 py-0.2 rounded border border-slate-600">P</kbd>
                  <span>Chamar Preferencial</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Botão Chamar Normal */}
              <button
                id="btn-trigger-call"
                type="button"
                disabled={isCalling || !callText.trim() || !selectedPlayerId}
                onClick={() => handleTriggerCall(false)}
                className="flex items-center justify-between gap-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 py-4 px-5 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white shadow-lg shadow-blue-900/40 focus:ring-2 focus:ring-blue-500/50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                title="Disparar chamada normal (ou pressione a tecla N no teclado quando fora da caixa de texto)"
              >
                <div className="flex items-center gap-2.5">
                  <Send className="h-4 w-4 shrink-0" />
                  <span>{isCalling ? 'Enviando chamada...' : '[ CHAMAR NORMAL ]'}</span>
                </div>
                <span className="shrink-0 flex items-center gap-1 bg-blue-700/90 border border-blue-400/40 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold tracking-normal text-blue-100 shadow-inner group-hover:bg-blue-800 transition">
                  <Keyboard className="h-3 w-3" />
                  Tecla N
                </span>
              </button>

              {/* Botão Chamar Preferencial Direto */}
              <button
                id="btn-trigger-call-priority"
                type="button"
                disabled={isCalling || !callText.trim() || !selectedPlayerId}
                onClick={() => handleTriggerCall(true)}
                className="flex items-center justify-between gap-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 py-4 px-5 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-950/50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                title="Disparar chamada preferencial (ou pressione a tecla P no teclado quando fora da caixa de texto)"
              >
                <div className="flex items-center gap-2.5">
                  <Star className="h-4 w-4 fill-slate-950 shrink-0" />
                  <span>{isCalling ? 'Enviando chamada...' : '[ CHAMAR PREFERENCIAL ]'}</span>
                </div>
                <span className="shrink-0 flex items-center gap-1 bg-amber-700/80 border border-slate-950/40 px-2.5 py-1 rounded-md text-[11px] font-mono font-black tracking-normal text-slate-950 shadow-inner group-hover:bg-amber-800/80 transition">
                  <Keyboard className="h-3 w-3" />
                  Tecla P
                </span>
              </button>
            </div>

            {/* Confirmação de Envio */}
            {lastCallDelivered !== null && (
              <div className="mt-2 text-center text-xs font-medium text-emerald-400 flex items-center justify-center gap-2 bg-emerald-950/30 border border-emerald-900/50 py-2.5 px-4 rounded-xl">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  Chamada transmitida com sucesso para o player {selectedPlayer ? `(${selectedPlayer.name})` : ''} às {lastCallTime}. A frase continua salva para as próximas chamadas.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTEÚDO DA ABA 2: DIAGNÓSTICO DOS PLAYERS (COMPLETO E ISOLADO)           */}
      {/* ========================================================================= */}
      {activeTab === 'diagnostic' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Cabeçalho de Status Geral */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-slate-700 bg-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total de Telas</span>
              <p className="text-xl font-black text-white mt-0.5">{players.length}</p>
            </div>
            <div className="p-3 rounded-xl border border-emerald-900/50 bg-emerald-950/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Online</span>
              <p className="text-xl font-black text-emerald-300 mt-0.5">{onlinePlayersCount}</p>
            </div>
            <div className="p-3 rounded-xl border border-rose-900/50 bg-rose-950/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Offline</span>
              <p className="text-xl font-black text-rose-300 mt-0.5">{offlinePlayersCount}</p>
            </div>
            <div className="p-3 rounded-xl border border-slate-700 bg-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Intervalo Máx</span>
              <p className="text-xl font-black text-blue-400 mt-0.5">45s</p>
            </div>
          </div>

          {/* Banner de Atenção se houver telas Offline */}
          {offlinePlayersCount > 0 && (
            <div className="rounded-xl border border-rose-800/80 bg-rose-950/40 p-4 text-rose-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wide">
                    {offlinePlayersCount} {offlinePlayersCount === 1 ? 'Player Desconectado' : 'Players Desconectados'}
                  </h4>
                  <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
                    Telas que não enviarem sinal de batimento (heartbeat) por mais de 45 segundos são marcadas como offline. Verifique conexão Wi-Fi, energia da Smart TV/TV Box ou acesse a simulação.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Seletor de Player para Diagnóstico Detalhado */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-sm">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-3">
              Selecione o Player para Inspecionar Conexão e Batimentos:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {players.map((p) => {
                const isSelected = p.id === activeDiagnosticPlayer?.id;
                const elapsed = getPlayerQuickElapsed(p.last_seen);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setDiagnosticPlayerId(p.id);
                      setSelectedPlayerId(p.id);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-950/50 ring-1 ring-blue-500'
                        : 'border-slate-700 bg-slate-900/60 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-sm">{p.name}</span>
                        <span className="font-mono text-[10px] text-blue-400 bg-slate-950 px-1 py-0.2 rounded border border-slate-800">
                          {p.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{p.location || 'Sem localização'}</p>
                      <p className="text-[10px] text-slate-500 mt-1">Último sinal: {elapsed}</p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        p.is_online
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          p.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                        }`}
                      />
                      {p.is_online ? 'Online' : 'Offline'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Componente Detalhado de Diagnóstico */}
          {activeDiagnosticPlayer && (
            <PlayerDiagnosticView
              player={activeDiagnosticPlayer}
              allPlayers={players}
              onSelectPlayer={(id) => {
                setDiagnosticPlayerId(id);
                setSelectedPlayerId(id);
              }}
              onRefresh={loadData}
              onOpenSimulation={onOpenPlayerSimulation}
              showToast={showToast}
            />
          )}
        </div>
      )}
    </div>
  );
};
