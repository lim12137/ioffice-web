import { describe, expect, it, jest } from '@jest/globals';
import { WebSocket } from 'ws';

jest.mock('@/webserver/auth/middleware/TokenMiddleware', () => ({
  TokenMiddleware: {
    extractWebSocketToken: jest.fn(),
    verifyWebSocketToken: jest.fn(),
    validateWebSocketToken: jest.fn(() => true),
  },
}));

import { WebSocketManager } from '@/webserver/websocket/WebSocketManager';

type MockSocket = WebSocket & {
  send: jest.Mock;
  close: jest.Mock;
  on: jest.Mock;
};

function createMockSocket(readyState: number = WebSocket.OPEN): MockSocket {
  return {
    readyState,
    send: jest.fn(),
    close: jest.fn(),
    on: jest.fn(),
  } as unknown as MockSocket;
}

describe('WebSocketManager broadcast scope', () => {
  it('sends scoped events only to matching userId clients', () => {
    const manager = new WebSocketManager({ on: jest.fn() } as unknown as import('ws').WebSocketServer);
    const wsUserA1 = createMockSocket();
    const wsUserA2 = createMockSocket();
    const wsUserB = createMockSocket();

    const clients = (manager as unknown as { clients: Map<WebSocket, { token: string; lastPing: number; context: { userId: string; username: string } }> }).clients;
    const now = Date.now();
    clients.set(wsUserA1, { token: 'token-a1', lastPing: now, context: { userId: 'user-a', username: 'alice' } });
    clients.set(wsUserA2, { token: 'token-a2', lastPing: now, context: { userId: 'user-a', username: 'alice2' } });
    clients.set(wsUserB, { token: 'token-b', lastPing: now, context: { userId: 'user-b', username: 'bob' } });

    manager.broadcast('chat.response.stream', { content: 'hello' }, { userId: 'user-a' });

    expect(wsUserA1.send).toHaveBeenCalledTimes(1);
    expect(wsUserA2.send).toHaveBeenCalledTimes(1);
    expect(wsUserB.send).not.toHaveBeenCalled();
  });

  it('keeps unscoped broadcast behavior for public events', () => {
    const manager = new WebSocketManager({ on: jest.fn() } as unknown as import('ws').WebSocketServer);
    const wsOpen = createMockSocket();
    const wsClosed = createMockSocket(WebSocket.CLOSED);

    const clients = (manager as unknown as { clients: Map<WebSocket, { token: string; lastPing: number; context: { userId: string; username: string } }> }).clients;
    const now = Date.now();
    clients.set(wsOpen, { token: 'token-open', lastPing: now, context: { userId: 'user-a', username: 'alice' } });
    clients.set(wsClosed, { token: 'token-closed', lastPing: now, context: { userId: 'user-b', username: 'bob' } });

    manager.broadcast('window-controls:maximized-changed', { isMaximized: true });

    expect(wsOpen.send).toHaveBeenCalledTimes(1);
    expect(wsClosed.send).not.toHaveBeenCalled();
  });
});
