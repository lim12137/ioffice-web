/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { uuid } from '@/common/utils';
import type { IChannelAccessIdentity, IChannelActiveLease, IChannelGateHeartbeatResult, IChannelGateJoinResult, IChannelGateLeaveResult, IChannelGateStatus, IChannelGateUserState, IChannelIsolationConfig, IChannelQueueEntry } from '../types';

const DEFAULT_ISOLATION_CONFIG: Omit<IChannelIsolationConfig, 'createdAt' | 'updatedAt'> = {
  id: 'default',
  maxActiveUsers: 5,
  heartbeatTimeoutMs: 120000,
  queueTimeoutMs: 600000,
  maxQueueSize: 1000,
  maxOfflineJobsPerUser: 20,
  defaultUserQuotaBytes: 2147483648,
};

type IsolationStoreLike = {
  getConfig: () => IChannelIsolationConfig | null;
  markExpiredLeases: (now: number) => number;
  markTimedOutQueueEntries: (now: number) => number;
  countLeases: (status: 'active' | 'released' | 'expired') => number;
  countQueue: (status: 'waiting' | 'admitted' | 'cancelled' | 'timed_out') => number;
  getActiveLeaseByUserChat: (userId: string, chatId: string) => IChannelActiveLease | null;
  updateLeaseHeartbeat: (id: string, heartbeatAt: number, expiresAt: number, now: number) => number;
  getWaitingQueueEntryByUserChat: (userId: string, chatId: string) => IChannelQueueEntry | null;
  admitQueueEntry: (id: string, admittedAt: number, now: number) => number;
  upsertLease: (lease: IChannelActiveLease) => number;
  upsertQueueEntry: (entry: IChannelQueueEntry) => number;
  listQueue: (status: 'waiting' | 'admitted' | 'cancelled' | 'timed_out') => IChannelQueueEntry[];
  getNextWaitingQueueEntry: () => IChannelQueueEntry | null;
  updateQueueStatus: (id: string, status: 'waiting' | 'admitted' | 'cancelled' | 'timed_out', now: number, note?: string) => number;
  getLeaseById: (id: string) => IChannelActiveLease | null;
  updateLeaseStatus: (id: string, status: 'active' | 'released' | 'expired', now: number, reason?: string) => number;
};

export class AccessGateService {
  private readonly store: IsolationStoreLike;

  constructor(store?: IsolationStoreLike) {
    this.store = store ?? AccessGateService.resolveDefaultStore();
  }

  private static resolveDefaultStore(): IsolationStoreLike {
    // Lazy-load to avoid test-time side effects when a custom in-memory store is injected.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require('./IsolationStore') as { isolationStore: IsolationStoreLike };
    return module.isolationStore;
  }

  private getConfig(now: number): IChannelIsolationConfig {
    const configured = this.store.getConfig();
    if (configured) {
      return configured;
    }

    return {
      ...DEFAULT_ISOLATION_CONFIG,
      createdAt: now,
      updatedAt: now,
    };
  }

  private cleanup(now: number): void {
    this.store.markExpiredLeases(now);
    this.store.markTimedOutQueueEntries(now);
  }

  private buildLease(identity: IChannelAccessIdentity, now: number, heartbeatTimeoutMs: number): IChannelActiveLease {
    return {
      id: uuid(24),
      userId: identity.userId,
      platformType: identity.platformType,
      platformUserId: identity.platformUserId,
      chatId: identity.chatId,
      acquiredAt: now,
      lastHeartbeatAt: now,
      expiresAt: now + heartbeatTimeoutMs,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
  }

  private buildQueueEntry(identity: IChannelAccessIdentity, now: number, queueTimeoutMs: number): IChannelQueueEntry {
    return {
      id: uuid(24),
      userId: identity.userId,
      platformType: identity.platformType,
      platformUserId: identity.platformUserId,
      chatId: identity.chatId,
      enqueuedAt: now,
      status: 'waiting',
      expiresAt: now + queueTimeoutMs,
      createdAt: now,
      updatedAt: now,
    };
  }

  private getWaitingPosition(entryId: string): number | undefined {
    const queue = this.store.listQueue('waiting');
    const index = queue.findIndex((entry) => entry.id === entryId);
    return index >= 0 ? index + 1 : undefined;
  }

  private promoteNextWaiting(now: number, config: IChannelIsolationConfig): IChannelGateLeaveResult['promoted'] | undefined {
    while (true) {
      const next = this.store.getNextWaitingQueueEntry();
      if (!next) {
        return undefined;
      }

      if (next.expiresAt && next.expiresAt <= now) {
        this.store.updateQueueStatus(next.id, 'timed_out', now, 'queue_timeout');
        continue;
      }

      const admitted = this.store.admitQueueEntry(next.id, now, now);
      if (admitted <= 0) {
        continue;
      }

      const lease = this.buildLease(
        {
          userId: next.userId,
          platformType: next.platformType,
          platformUserId: next.platformUserId,
          chatId: next.chatId,
        },
        now,
        config.heartbeatTimeoutMs
      );
      this.store.upsertLease(lease);

      return {
        userId: next.userId,
        chatId: next.chatId,
        leaseId: lease.id,
        queueEntryId: next.id,
      };
    }
  }

  join(identity: IChannelAccessIdentity, now: number = Date.now()): IChannelGateJoinResult {
    const config = this.getConfig(now);
    this.cleanup(now);

    const activeCount = this.store.countLeases('active');
    const queueSize = this.store.countQueue('waiting');

    const existingLease = this.store.getActiveLeaseByUserChat(identity.userId, identity.chatId);
    if (existingLease) {
      const expiresAt = now + config.heartbeatTimeoutMs;
      this.store.updateLeaseHeartbeat(existingLease.id, now, expiresAt, now);
      return {
        decision: 'admitted',
        leaseId: existingLease.id,
        expiresAt,
        activeCount,
        maxActiveUsers: config.maxActiveUsers,
        queueSize,
        maxQueueSize: config.maxQueueSize,
      };
    }

    const waitingEntry = this.store.getWaitingQueueEntryByUserChat(identity.userId, identity.chatId);
    if (waitingEntry) {
      if (activeCount < config.maxActiveUsers) {
        this.store.admitQueueEntry(waitingEntry.id, now, now);
        const lease = this.buildLease(identity, now, config.heartbeatTimeoutMs);
        this.store.upsertLease(lease);
        return {
          decision: 'admitted',
          leaseId: lease.id,
          queueEntryId: waitingEntry.id,
          expiresAt: lease.expiresAt,
          activeCount: activeCount + 1,
          maxActiveUsers: config.maxActiveUsers,
          queueSize: Math.max(0, queueSize - 1),
          maxQueueSize: config.maxQueueSize,
        };
      }

      return {
        decision: 'queued',
        queueEntryId: waitingEntry.id,
        queuePosition: this.getWaitingPosition(waitingEntry.id),
        expiresAt: waitingEntry.expiresAt,
        activeCount,
        maxActiveUsers: config.maxActiveUsers,
        queueSize,
        maxQueueSize: config.maxQueueSize,
      };
    }

    if (activeCount < config.maxActiveUsers) {
      const lease = this.buildLease(identity, now, config.heartbeatTimeoutMs);
      this.store.upsertLease(lease);
      return {
        decision: 'admitted',
        leaseId: lease.id,
        expiresAt: lease.expiresAt,
        activeCount: activeCount + 1,
        maxActiveUsers: config.maxActiveUsers,
        queueSize,
        maxQueueSize: config.maxQueueSize,
      };
    }

    if (queueSize >= config.maxQueueSize) {
      return {
        decision: 'rejected',
        reason: 'queue_full',
        activeCount,
        maxActiveUsers: config.maxActiveUsers,
        queueSize,
        maxQueueSize: config.maxQueueSize,
      };
    }

    const queueEntry = this.buildQueueEntry(identity, now, config.queueTimeoutMs);
    this.store.upsertQueueEntry(queueEntry);
    return {
      decision: 'queued',
      queueEntryId: queueEntry.id,
      queuePosition: this.getWaitingPosition(queueEntry.id) ?? queueSize + 1,
      expiresAt: queueEntry.expiresAt,
      activeCount,
      maxActiveUsers: config.maxActiveUsers,
      queueSize: queueSize + 1,
      maxQueueSize: config.maxQueueSize,
    };
  }

  heartbeat(identity: IChannelAccessIdentity, leaseId?: string, now: number = Date.now()): IChannelGateHeartbeatResult {
    const config = this.getConfig(now);
    this.cleanup(now);

    const lease = leaseId ? this.store.getLeaseById(leaseId) : this.store.getActiveLeaseByUserChat(identity.userId, identity.chatId);
    if (!lease || lease.status !== 'active') {
      return { success: false, reason: 'lease_not_found' };
    }

    if (lease.userId !== identity.userId || lease.chatId !== identity.chatId) {
      return { success: false, reason: 'identity_mismatch' };
    }

    const expiresAt = now + config.heartbeatTimeoutMs;
    const updated = this.store.updateLeaseHeartbeat(lease.id, now, expiresAt, now);
    if (updated <= 0) {
      return { success: false, reason: 'lease_not_active' };
    }

    return {
      success: true,
      leaseId: lease.id,
      expiresAt,
    };
  }

  leave(identity: IChannelAccessIdentity, leaseId?: string, reason: string = 'client_leave', now: number = Date.now()): IChannelGateLeaveResult {
    const config = this.getConfig(now);
    this.cleanup(now);

    const lease = leaseId ? this.store.getLeaseById(leaseId) : this.store.getActiveLeaseByUserChat(identity.userId, identity.chatId);
    if (!lease || lease.status !== 'active') {
      return { released: false, reason: 'lease_not_found' };
    }

    if (lease.userId !== identity.userId || lease.chatId !== identity.chatId) {
      return { released: false, reason: 'identity_mismatch' };
    }

    this.store.updateLeaseStatus(lease.id, 'released', now, reason);

    return {
      released: true,
      leaseId: lease.id,
      reason,
      promoted: this.promoteNextWaiting(now, config),
    };
  }

  status(identity?: IChannelAccessIdentity, now: number = Date.now()): IChannelGateStatus {
    const config = this.getConfig(now);
    this.cleanup(now);

    const activeCount = this.store.countLeases('active');
    const queueSize = this.store.countQueue('waiting');

    let user: IChannelGateUserState | undefined;
    if (identity) {
      const lease = this.store.getActiveLeaseByUserChat(identity.userId, identity.chatId);
      if (lease) {
        user = {
          state: 'active',
          leaseId: lease.id,
          expiresAt: lease.expiresAt,
        };
      } else {
        const waiting = this.store.getWaitingQueueEntryByUserChat(identity.userId, identity.chatId);
        if (waiting) {
          user = {
            state: 'waiting',
            queueEntryId: waiting.id,
            queuePosition: this.getWaitingPosition(waiting.id),
            expiresAt: waiting.expiresAt,
          };
        } else {
          user = { state: 'none' };
        }
      }
    }

    return {
      activeCount,
      maxActiveUsers: config.maxActiveUsers,
      availableSlots: Math.max(0, config.maxActiveUsers - activeCount),
      queueSize,
      maxQueueSize: config.maxQueueSize,
      heartbeatTimeoutMs: config.heartbeatTimeoutMs,
      queueTimeoutMs: config.queueTimeoutMs,
      user,
    };
  }
}

let accessGateServiceInstance: AccessGateService | null = null;

export function getAccessGateService(): AccessGateService {
  if (!accessGateServiceInstance) {
    accessGateServiceInstance = new AccessGateService();
  }
  return accessGateServiceInstance;
}
