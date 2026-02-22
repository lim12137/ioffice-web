/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/database';
import { getBridgeRequestUserId } from './bridgeRequestContext';

/**
 * Checks whether current bridge caller can access a conversation.
 * Electron/local requests are treated as unrestricted.
 */
export function canAccessConversation(conversationId: string): boolean {
  const userId = getBridgeRequestUserId();
  if (!userId) {
    return true;
  }

  const db = getDatabase();
  const result = db.getConversation(conversationId, userId);
  return !!(result.success && result.data);
}
