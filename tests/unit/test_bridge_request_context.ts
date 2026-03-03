import { getBridgeRequestContext, getBridgeRequestUserId, runWithBridgeRequestContext } from '@/process/bridge/bridgeRequestContext';
import { describe, expect, it } from '@jest/globals';

describe('bridgeRequestContext', () => {
  it('returns undefined user without context', () => {
    expect(getBridgeRequestContext()).toBeUndefined();
    expect(getBridgeRequestUserId()).toBeUndefined();
  });

  it('exposes userId for websocket context', () => {
    runWithBridgeRequestContext(
      {
        transport: 'websocket',
        userId: 'user_123',
        username: 'alice',
      },
      () => {
        expect(getBridgeRequestContext()).toEqual({
          transport: 'websocket',
          userId: 'user_123',
          username: 'alice',
        });
        expect(getBridgeRequestUserId()).toBe('user_123');
      }
    );
  });

  it('does not expose userId for electron context', () => {
    runWithBridgeRequestContext(
      {
        transport: 'electron',
      },
      () => {
        expect(getBridgeRequestContext()).toEqual({
          transport: 'electron',
        });
        expect(getBridgeRequestUserId()).toBeUndefined();
      }
    );
  });
});
