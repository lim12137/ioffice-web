/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from '@jest/globals';
import { AccessGateService } from '../../src/channels/isolation/AccessGateService';
import type { ChannelLeaseStatus, ChannelQueueStatus, IChannelAccessIdentity, IChannelActiveLease, IChannelIsolationConfig, IChannelQueueEntry } from '../../src/channels/types';

class MemoryIsolationStore {
  private config: IChannelIsolationConfig;
  private leases = new Map<string, IChannelActiveLease>();
  private queue = new Map<string, IChannelQueueEntry>();

  constructor(config: IChannelIsolationConfig) {
    this.config = config;
  }

  getConfig(): IChannelIsolationConfig | null {
    return this.config;
  }

  markExpiredLeases(now: number): number {
    let changes = 0;
    for (const lease of this.leases.values()) {
      if (lease.status === 'active' && lease.expiresAt <= now) {
        lease.status = 'expired';
        lease.releaseReason = lease.releaseReason || 'heartbeat_timeout';
        lease.updatedAt = now;
        changes++;
      }
    }
    return changes;
  }

  markTimedOutQueueEntries(now: number): number {
    let changes = 0;
    for (const entry of this.queue.values()) {
      if (entry.status === 'waiting' && entry.expiresAt && entry.expiresAt <= now) {
        entry.status = 'timed_out';
        entry.note = entry.note || 'queue_timeout';
        entry.updatedAt = now;
        changes++;
      }
    }
    return changes;
  }

  countLeases(status: ChannelLeaseStatus): number {
    return [...this.leases.values()].filter((lease) => lease.status === status).length;
  }

  countQueue(status: ChannelQueueStatus): number {
    return [...this.queue.values()].filter((entry) => entry.status === status).length;
  }

  getActiveLeaseByUserChat(userId: string, chatId: string): IChannelActiveLease | null {
    return [...this.leases.values()].find((lease) => lease.userId === userId && lease.chatId === chatId && lease.status === 'active') ?? null;
  }

  updateLeaseHeartbeat(id: string, heartbeatAt: number, expiresAt: number, now: number): number {
    const lease = this.leases.get(id);
    if (!lease || lease.status !== 'active') return 0;
    lease.lastHeartbeatAt = heartbeatAt;
    lease.expiresAt = expiresAt;
    lease.updatedAt = now;
    return 1;
  }

  getWaitingQueueEntryByUserChat(userId: string, chatId: string): IChannelQueueEntry | null {
    return [...this.queue.values()].find((entry) => entry.userId === userId && entry.chatId === chatId && entry.status === 'waiting') ?? null;
  }

  admitQueueEntry(id: string, admittedAt: number, now: number): number {
    const entry = this.queue.get(id);
    if (!entry || entry.status !== 'waiting') return 0;
    entry.status = 'admitted';
    entry.admittedAt = admittedAt;
    entry.updatedAt = now;
    return 1;
  }

  upsertLease(lease: IChannelActiveLease): number {
    this.leases.set(lease.id, lease);
    return 1;
  }

  upsertQueueEntry(entry: IChannelQueueEntry): number {
    this.queue.set(entry.id, entry);
    return 1;
  }

  listQueue(status: ChannelQueueStatus): IChannelQueueEntry[] {
    return [...this.queue.values()].filter((entry) => entry.status === status).sort((a, b) => a.enqueuedAt - b.enqueuedAt);
  }

  getNextWaitingQueueEntry(): IChannelQueueEntry | null {
    return this.listQueue('waiting')[0] ?? null;
  }

  updateQueueStatus(id: string, status: ChannelQueueStatus, now: number, note?: string): number {
    const entry = this.queue.get(id);
    if (!entry) return 0;
    entry.status = status;
    if (note) entry.note = note;
    entry.updatedAt = now;
    return 1;
  }

  getLeaseById(id: string): IChannelActiveLease | null {
    return this.leases.get(id) ?? null;
  }

  updateLeaseStatus(id: string, status: ChannelLeaseStatus, now: number, reason?: string): number {
    const lease = this.leases.get(id);
    if (!lease) return 0;
    lease.status = status;
    lease.updatedAt = now;
    if (reason) lease.releaseReason = reason;
    return 1;
  }
}

const makeConfig = (maxActiveUsers: number, maxQueueSize = 10): IChannelIsolationConfig => ({
  id: 'default',
  maxActiveUsers,
  heartbeatTimeoutMs: 120000,
  queueTimeoutMs: 600000,
  maxQueueSize,
  maxOfflineJobsPerUser: 20,
  defaultUserQuotaBytes: 2147483648,
  createdAt: 1,
  updatedAt: 1,
});

const id = (userId: string, chatId: string): IChannelAccessIdentity => ({
  userId,
  platformType: 'slack',
  platformUserId: userId,
  chatId,
});

describe('AccessGateService', () => {
  it('admits first user and supports heartbeat/status', () => {
    const store = new MemoryIsolationStore(makeConfig(1));
    const gate = new AccessGateService(store);

    const join = gate.join(id('u1', 'c1'), 1000);
    expect(join.decision).toBe('admitted');
    expect(join.leaseId).toBeDefined();
    expect(join.activeCount).toBe(1);

    const hb = gate.heartbeat(id('u1', 'c1'), join.leaseId, 1500);
    expect(hb.success).toBe(true);
    expect(hb.leaseId).toBe(join.leaseId);

    const status = gate.status(id('u1', 'c1'), 1600);
    expect(status.activeCount).toBe(1);
    expect(status.user?.state).toBe('active');
    expect(status.user?.leaseId).toBe(join.leaseId);
  });

  it('returns queued status projection for waiting user', () => {
    const store = new MemoryIsolationStore(makeConfig(1));
    const gate = new AccessGateService(store);

    const first = gate.join(id('u1', 'c1'), 1000);
    const second = gate.join(id('u2', 'c2'), 1010);

    expect(first.decision).toBe('admitted');
    expect(second.decision).toBe('queued');

    const queuedStatus = gate.status(id('u2', 'c2'), 1020);
    expect(queuedStatus.activeCount).toBe(1);
    expect(queuedStatus.queueSize).toBe(1);
    expect(queuedStatus.user?.state).toBe('waiting');
    expect(queuedStatus.user?.queueEntryId).toBe(second.queueEntryId);
    expect(queuedStatus.user?.queuePosition).toBe(1);
  });

  it('expires lease without heartbeat and allows re-admission', () => {
    const store = new MemoryIsolationStore(makeConfig(1));
    const gate = new AccessGateService(store);

    const firstJoin = gate.join(id('u1', 'c1'), 1000);
    expect(firstJoin.decision).toBe('admitted');

    const expiredStatus = gate.status(id('u1', 'c1'), 1000 + 120001);
    expect(expiredStatus.activeCount).toBe(0);
    expect(expiredStatus.user?.state).toBe('none');

    const secondJoin = gate.join(id('u1', 'c1'), 1000 + 120002);
    expect(secondJoin.decision).toBe('admitted');
    expect(secondJoin.leaseId).toBeDefined();
    expect(secondJoin.leaseId).not.toBe(firstJoin.leaseId);
  });

  it('queues second user and promotes on leave', () => {
    const store = new MemoryIsolationStore(makeConfig(1));
    const gate = new AccessGateService(store);

    const first = gate.join(id('u1', 'c1'), 1000);
    const second = gate.join(id('u2', 'c2'), 1010);
    expect(first.decision).toBe('admitted');
    expect(second.decision).toBe('queued');
    expect(second.queuePosition).toBe(1);

    const leave = gate.leave(id('u1', 'c1'), first.leaseId, 'done', 1020);
    expect(leave.released).toBe(true);
    expect(leave.promoted?.userId).toBe('u2');
    expect(leave.promoted?.chatId).toBe('c2');

    const status = gate.status(id('u2', 'c2'), 1030);
    expect(status.activeCount).toBe(1);
    expect(status.queueSize).toBe(0);
    expect(status.user?.state).toBe('active');
  });

  it('rejects when active slots and queue are both full', () => {
    const store = new MemoryIsolationStore(makeConfig(1, 1));
    const gate = new AccessGateService(store);

    const first = gate.join(id('u1', 'c1'), 1000);
    const second = gate.join(id('u2', 'c2'), 1001);
    const third = gate.join(id('u3', 'c3'), 1002);

    expect(first.decision).toBe('admitted');
    expect(second.decision).toBe('queued');
    expect(third.decision).toBe('rejected');
    expect(third.reason).toBe('queue_full');
  });
});
