import { Response } from 'express';
import { db, PlayerCall } from './db.js';

interface SSEClient {
  id: string;
  res: Response;
  playerId?: string;
  playerCode?: string;
  companyId?: string;
}

class RealtimeHub {
  private clients: SSEClient[] = [];
  private activeCalls: Map<string, PlayerCall> = new Map();

  constructor() {
    // Keep-alive heartbeat to prevent proxies/browsers from killing SSE
    setInterval(() => {
      this.sendKeepAlive();
    }, 15000);

    // Check every 10 seconds for offline players
    setInterval(() => {
      this.checkOfflinePlayers();
    }, 10000);
  }

  private sendKeepAlive() {
    const keepAliveMsg = `: keep-alive ${Date.now()}\n\n`;
    for (const client of this.clients) {
      try {
        client.res.write(keepAliveMsg);
      } catch {
        // Handled on close
      }
    }
  }

  public addClient(client: SSEClient) {
    this.clients.push(client);

    // Initial keep-alive & connection ack
    try {
      client.res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);

      // If this player has an ongoing active call, deliver it immediately on connect
      if (client.playerId) {
        const active = this.getActiveCall(client.playerId);
        if (active) {
          const payload = JSON.stringify({ type: 'CALL_EVENT', call: active, data: active });
          client.res.write(`data: ${payload}\n\n`);
        }
      }
    } catch (e) {
      console.warn('Failed to send initial SSE ack:', e);
    }

    client.res.req.on('close', () => {
      this.clients = this.clients.filter((c) => c.id !== client.id);
    });
  }

  public getActiveCall(playerIdOrCode: string): PlayerCall | null {
    const target = playerIdOrCode.trim().toLowerCase();
    const data = db.getData();

    // Find player ID if a code was passed
    const player = data.players.find(
      (p) => p.id.toLowerCase() === target || p.code.toLowerCase() === target
    );
    const playerId = player ? player.id : target;

    const memoryCall = this.activeCalls.get(playerId);
    const now = Date.now();

    if (memoryCall) {
      const elapsed = now - new Date(memoryCall.created_at).getTime();
      if (elapsed < (memoryCall.duration || 10) * 1000) {
        return memoryCall;
      } else {
        this.activeCalls.delete(playerId);
      }
    }

    // Check persistent db calls
    const recent = [...data.player_calls]
      .filter((c) => c.player_id === playerId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (recent) {
      const elapsed = now - new Date(recent.created_at).getTime();
      if (elapsed < (recent.duration || 10) * 1000) {
        this.activeCalls.set(playerId, recent);
        return recent;
      }
    }

    return null;
  }

  public sendCallToPlayer(call: PlayerCall) {
    this.activeCalls.set(call.player_id, call);
    const message = `data: ${JSON.stringify({ type: 'CALL_EVENT', call, data: call })}\n\n`;
    let deliveredCount = 0;

    const targetPlayer = db.getData().players.find((p) => p.id === call.player_id);
    const targetCode = targetPlayer?.code?.toLowerCase();

    for (const client of this.clients) {
      const isPlayerMatch =
        (client.playerId && client.playerId === call.player_id) ||
        (targetCode && client.playerCode && client.playerCode.toLowerCase() === targetCode);

      const isCompanyMonitor =
        client.companyId && client.companyId === call.company_id && !client.playerId;

      if (isPlayerMatch || isCompanyMonitor) {
        try {
          client.res.write(message);
          deliveredCount++;
        } catch (err) {
          console.warn('Error writing SSE message to client:', err);
        }
      }
    }

    return deliveredCount > 0;
  }

  public broadcastPlayerStatus(playerId: string, companyId: string, isOnline: boolean) {
    const payload = JSON.stringify({
      type: 'PLAYER_STATUS_CHANGE',
      playerId,
      companyId,
      isOnline,
      lastSeen: new Date().toISOString(),
    });
    const message = `data: ${payload}\n\n`;

    for (const client of this.clients) {
      if (client.companyId === companyId || !client.companyId) {
        try {
          client.res.write(message);
        } catch {
          // Handled on close
        }
      }
    }
  }

  public recordHeartbeat(playerId: string) {
    const data = db.getData();
    const player = data.players.find((p) => p.id === playerId);
    if (!player) return false;

    const previousLastSeen = new Date(player.last_seen || 0).getTime();
    const wasOffline = Date.now() - previousLastSeen > 45000;

    player.last_seen = new Date().toISOString();
    db.persist();

    if (wasOffline) {
      this.broadcastPlayerStatus(player.id, player.company_id, true);
    }
    return true;
  }

  private checkOfflinePlayers() {
    const data = db.getData();
    const now = Date.now();
    for (const player of data.players) {
      const lastSeen = new Date(player.last_seen || 0).getTime();
      const isOnline = now - lastSeen <= 45000;
      // Heartbeat checks
    }
  }
}

export const realtimeHub = new RealtimeHub();
