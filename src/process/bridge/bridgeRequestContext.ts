/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { AsyncLocalStorage } from 'async_hooks';

export type BridgeTransport = 'electron' | 'websocket';

export interface BridgeRequestContext {
  transport: BridgeTransport;
  userId?: string;
  username?: string;
}

const requestContextStorage = new AsyncLocalStorage<BridgeRequestContext>();

export function runWithBridgeRequestContext<T>(context: BridgeRequestContext, callback: () => T): T {
  return requestContextStorage.run(context, callback);
}

export function getBridgeRequestContext(): BridgeRequestContext | undefined {
  return requestContextStorage.getStore();
}

export function getBridgeRequestUserId(): string | undefined {
  const context = requestContextStorage.getStore();
  if (!context || context.transport !== 'websocket') {
    return undefined;
  }
  return context.userId;
}
