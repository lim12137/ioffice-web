import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { WebSocket } from 'ws';

const tokenMiddlewareMock = {
  extractWebSocketToken: jest.fn<(_: unknown) => string | null>(),
  verifyWebSocketToken: jest.fn<(_: string | null) => { userId: string; username: string } | null>(),
  validateWebSocketToken: jest.fn<(_: string | null) => boolean>(),
};

jest.mock('@/webserver/auth/middleware/TokenMiddleware', () => ({
  TokenMiddleware: tokenMiddlewareMock,
}));

import { WebSocketManager } from '@/webserver/websocket/WebSocketManager';

type MessageListener = (rawData: Buffer) => void;
type MockSocket = WebSocket & {
  send: jest.Mock;
  close: jest.Mock;
  on: jest.Mock;
  triggerMessage: (payload: unknown) => void;
};

type MockWss = {
  on: jest.Mock;
  triggerConnection: (socket: MockSocket) => void;
};

function createMockSocket(readyState: number = WebSocket.OPEN): MockSocket {
  const listeners = new Map<string, (...args: unknown[]) => void>();

  return {
    readyState,
    send: jest.fn(),
    close: jest.fn(),
    on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      listeners.set(event, handler);
    }),
    triggerMessage: (payload: unknown) => {
      const messageHandler = listeners.get('message') as MessageListener | undefined;
      if (messageHandler) {
        messageHandler(Buffer.from(JSON.stringify(payload)));
      }
    },
  } as unknown as MockSocket;
}

function createMockWss(): MockWss {
  let connectionHandler: ((socket: MockSocket, req: unknown) => void) | null = null;

  return {
    on: jest.fn((event: string, handler: (socket: MockSocket, req: unknown) => void) => {
      if (event === 'connection') {
        connectionHandler = handler;
      }
    }),
    triggerConnection: (socket: MockSocket) => {
      if (!connectionHandler) {
        throw new Error('Connection handler is not registered');
      }
      connectionHandler(socket, {});
    },
  };
}

describe('WebSocketManager message token validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tokenMiddlewareMock.extractWebSocketToken.mockReturnValue('session-token');
    tokenMiddlewareMock.verifyWebSocketToken.mockReturnValue({ userId: 'user-a', username: 'alice' });
  });

  it('closes stale client before forwarding message when token is invalid', () => {
    tokenMiddlewareMock.validateWebSocketToken.mockReturnValue(false);

    const wss = createMockWss();
    const manager = new WebSocketManager(wss as unknown as import('ws').WebSocketServer);
    const onMessage = jest.fn();
    const socket = createMockSocket();

    manager.setupConnectionHandler(onMessage);
    wss.triggerConnection(socket);
    socket.triggerMessage({ name: 'database.get-user-conversations', data: {} });

    expect(onMessage).not.toHaveBeenCalled();
    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({
        name: 'auth-expired',
        data: { message: 'Token expired, please login again' },
      })
    );
    expect(socket.close).toHaveBeenCalledWith(1008, 'Token expired');

    const clients = (manager as unknown as { clients: Map<WebSocket, unknown> }).clients;
    expect(clients.has(socket)).toBe(false);
  });

  it('forwards message when token remains valid', () => {
    tokenMiddlewareMock.validateWebSocketToken.mockReturnValue(true);

    const wss = createMockWss();
    const manager = new WebSocketManager(wss as unknown as import('ws').WebSocketServer);
    const onMessage = jest.fn();
    const socket = createMockSocket();

    manager.setupConnectionHandler(onMessage);
    wss.triggerConnection(socket);
    socket.triggerMessage({ name: 'database.get-user-conversations', data: { page: 0 } });

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith('database.get-user-conversations', { page: 0 }, { userId: 'user-a', username: 'alice' }, socket);
    expect(socket.close).not.toHaveBeenCalled();
  });
});
