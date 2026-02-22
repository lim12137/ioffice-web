/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const getDatabaseMock = jest.fn();
const getBridgeRequestUserIdMock = jest.fn();

jest.mock('@process/database', () => ({
  getDatabase: () => getDatabaseMock(),
}));

jest.mock('@/process/bridge/bridgeRequestContext', () => ({
  getBridgeRequestUserId: () => getBridgeRequestUserIdMock(),
}));

import { canAccessConversation } from '@/process/bridge/conversationAccess';

describe('canAccessConversation', () => {
  beforeEach(() => {
    getDatabaseMock.mockReset();
    getBridgeRequestUserIdMock.mockReset();
  });

  it('allows requests without websocket user context', () => {
    getBridgeRequestUserIdMock.mockReturnValue(undefined);
    const dbGetConversation = jest.fn();
    getDatabaseMock.mockReturnValue({ getConversation: dbGetConversation });

    expect(canAccessConversation('conv_1')).toBe(true);
    expect(dbGetConversation).not.toHaveBeenCalled();
  });

  it('allows websocket user when conversation belongs to user', () => {
    getBridgeRequestUserIdMock.mockReturnValue('user_a');
    const dbGetConversation = jest.fn().mockReturnValue({
      success: true,
      data: { id: 'conv_1' },
    });
    getDatabaseMock.mockReturnValue({ getConversation: dbGetConversation });

    expect(canAccessConversation('conv_1')).toBe(true);
    expect(dbGetConversation).toHaveBeenCalledWith('conv_1', 'user_a');
  });

  it('blocks websocket user when conversation does not belong to user', () => {
    getBridgeRequestUserIdMock.mockReturnValue('user_a');
    const dbGetConversation = jest.fn().mockReturnValue({
      success: false,
      error: 'Conversation not found',
    });
    getDatabaseMock.mockReturnValue({ getConversation: dbGetConversation });

    expect(canAccessConversation('conv_b')).toBe(false);
    expect(dbGetConversation).toHaveBeenCalledWith('conv_b', 'user_a');
  });
});
