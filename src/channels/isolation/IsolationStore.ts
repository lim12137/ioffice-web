/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@/process/database';
import type { IChannelIsolationConfig, IChannelIsolationConfigRow, IChannelActiveLease, IChannelActiveLeaseRow, IChannelQueueEntry, IChannelQueueEntryRow, ChannelLeaseStatus, ChannelQueueStatus } from '../types';
import { channelIsolationConfigToRow, channelActiveLeaseToRow, channelQueueEntryToRow, rowToChannelIsolationConfig, rowToChannelActiveLease, rowToChannelQueueEntry } from '../types';

/**
 * IsolationStore - Database-backed store for channel isolation
 */
class IsolationStore {
  private db() {
    return getDatabase().getNativeDb();
  }

  getConfig(): IChannelIsolationConfig | null {
    const row = this.db().prepare('SELECT * FROM assistant_isolation_config WHERE id = ? LIMIT 1').get('default') as IChannelIsolationConfigRow | undefined;
    return row ? rowToChannelIsolationConfig(row) : null;
  }

  upsertConfig(config: IChannelIsolationConfig): number {
    const row = channelIsolationConfigToRow(config);
    const result = this.db()
      .prepare(
        `
        INSERT INTO assistant_isolation_config (
          id, max_active_users, heartbeat_timeout_ms, queue_timeout_ms, max_queue_size,
          max_offline_jobs_per_user, default_user_quota_bytes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          max_active_users = excluded.max_active_users,
          heartbeat_timeout_ms = excluded.heartbeat_timeout_ms,
          queue_timeout_ms = excluded.queue_timeout_ms,
          max_queue_size = excluded.max_queue_size,
          max_offline_jobs_per_user = excluded.max_offline_jobs_per_user,
          default_user_quota_bytes = excluded.default_user_quota_bytes,
          updated_at = excluded.updated_at
      `
      )
      .run(row.id, row.max_active_users, row.heartbeat_timeout_ms, row.queue_timeout_ms, row.max_queue_size, row.max_offline_jobs_per_user, row.default_user_quota_bytes, row.created_at, row.updated_at);
    return result.changes;
  }

  getLeaseById(id: string): IChannelActiveLease | null {
    const row = this.db().prepare('SELECT * FROM assistant_active_leases WHERE id = ? LIMIT 1').get(id) as IChannelActiveLeaseRow | undefined;
    return row ? rowToChannelActiveLease(row) : null;
  }

  getActiveLeaseByUserChat(userId: string, chatId: string): IChannelActiveLease | null {
    const row = this.db()
      .prepare(
        `
        SELECT * FROM assistant_active_leases
        WHERE user_id = ? AND chat_id = ? AND status = 'active'
        ORDER BY acquired_at DESC
        LIMIT 1
      `
      )
      .get(userId, chatId) as IChannelActiveLeaseRow | undefined;
    return row ? rowToChannelActiveLease(row) : null;
  }

  upsertLease(lease: IChannelActiveLease): number {
    const row = channelActiveLeaseToRow(lease);
    const result = this.db()
      .prepare(
        `
        INSERT INTO assistant_active_leases (
          id, user_id, platform_type, platform_user_id, chat_id, acquired_at, last_heartbeat_at,
          expires_at, status, release_reason, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          user_id = excluded.user_id,
          platform_type = excluded.platform_type,
          platform_user_id = excluded.platform_user_id,
          chat_id = excluded.chat_id,
          acquired_at = excluded.acquired_at,
          last_heartbeat_at = excluded.last_heartbeat_at,
          expires_at = excluded.expires_at,
          status = excluded.status,
          release_reason = excluded.release_reason,
          updated_at = excluded.updated_at
      `
      )
      .run(row.id, row.user_id, row.platform_type, row.platform_user_id, row.chat_id, row.acquired_at, row.last_heartbeat_at, row.expires_at, row.status, row.release_reason, row.created_at, row.updated_at);
    return result.changes;
  }

  updateLeaseHeartbeat(id: string, heartbeatAt: number, expiresAt: number, now: number): number {
    const result = this.db().prepare('UPDATE assistant_active_leases SET last_heartbeat_at = ?, expires_at = ?, updated_at = ? WHERE id = ? AND status = ?').run(heartbeatAt, expiresAt, now, id, 'active');
    return result.changes;
  }

  updateLeaseStatus(id: string, status: ChannelLeaseStatus, now: number, reason?: string): number {
    const releaseReason = status === 'released' || status === 'expired' ? (reason ?? null) : null;
    const result = this.db().prepare('UPDATE assistant_active_leases SET status = ?, release_reason = ?, updated_at = ? WHERE id = ?').run(status, releaseReason, now, id);
    return result.changes;
  }

  markExpiredLeases(now: number): number {
    const result = this.db()
      .prepare(
        `
        UPDATE assistant_active_leases
        SET status = 'expired',
            release_reason = COALESCE(release_reason, 'heartbeat_timeout'),
            updated_at = ?
        WHERE status = 'active' AND expires_at <= ?
      `
      )
      .run(now, now);
    return result.changes;
  }

  countLeases(status: ChannelLeaseStatus): number {
    const row = this.db().prepare('SELECT COUNT(*) AS count FROM assistant_active_leases WHERE status = ?').get(status) as { count: number };
    return row?.count ?? 0;
  }

  listLeases(status?: ChannelLeaseStatus): IChannelActiveLease[] {
    const rows = status ? (this.db().prepare('SELECT * FROM assistant_active_leases WHERE status = ? ORDER BY acquired_at ASC').all(status) as IChannelActiveLeaseRow[]) : (this.db().prepare('SELECT * FROM assistant_active_leases ORDER BY acquired_at ASC').all() as IChannelActiveLeaseRow[]);
    return rows.map(rowToChannelActiveLease);
  }

  getWaitingQueueEntryByUserChat(userId: string, chatId: string): IChannelQueueEntry | null {
    const row = this.db()
      .prepare(
        `
        SELECT * FROM assistant_wait_queue
        WHERE user_id = ? AND chat_id = ? AND status = 'waiting'
        ORDER BY enqueued_at ASC
        LIMIT 1
      `
      )
      .get(userId, chatId) as IChannelQueueEntryRow | undefined;
    return row ? rowToChannelQueueEntry(row) : null;
  }

  getNextWaitingQueueEntry(): IChannelQueueEntry | null {
    const row = this.db()
      .prepare(
        `
        SELECT * FROM assistant_wait_queue
        WHERE status = 'waiting'
        ORDER BY enqueued_at ASC, created_at ASC
        LIMIT 1
      `
      )
      .get() as IChannelQueueEntryRow | undefined;
    return row ? rowToChannelQueueEntry(row) : null;
  }

  upsertQueueEntry(entry: IChannelQueueEntry): number {
    const row = channelQueueEntryToRow(entry);
    const result = this.db()
      .prepare(
        `
        INSERT INTO assistant_wait_queue (
          id, user_id, platform_type, platform_user_id, chat_id, enqueued_at, last_notified_at,
          status, admitted_at, expires_at, note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          user_id = excluded.user_id,
          platform_type = excluded.platform_type,
          platform_user_id = excluded.platform_user_id,
          chat_id = excluded.chat_id,
          enqueued_at = excluded.enqueued_at,
          last_notified_at = excluded.last_notified_at,
          status = excluded.status,
          admitted_at = excluded.admitted_at,
          expires_at = excluded.expires_at,
          note = excluded.note,
          updated_at = excluded.updated_at
      `
      )
      .run(row.id, row.user_id, row.platform_type, row.platform_user_id, row.chat_id, row.enqueued_at, row.last_notified_at, row.status, row.admitted_at, row.expires_at, row.note, row.created_at, row.updated_at);
    return result.changes;
  }

  updateQueueStatus(id: string, status: ChannelQueueStatus, now: number, note?: string): number {
    const result = this.db()
      .prepare('UPDATE assistant_wait_queue SET status = ?, note = COALESCE(?, note), updated_at = ? WHERE id = ?')
      .run(status, note ?? null, now, id);
    return result.changes;
  }

  admitQueueEntry(id: string, admittedAt: number, now: number): number {
    const result = this.db().prepare('UPDATE assistant_wait_queue SET status = ?, admitted_at = ?, updated_at = ? WHERE id = ? AND status = ?').run('admitted', admittedAt, now, id, 'waiting');
    return result.changes;
  }

  markTimedOutQueueEntries(now: number): number {
    const result = this.db()
      .prepare(
        `
        UPDATE assistant_wait_queue
        SET status = 'timed_out',
            note = COALESCE(note, 'queue_timeout'),
            updated_at = ?
        WHERE status = 'waiting' AND expires_at IS NOT NULL AND expires_at <= ?
      `
      )
      .run(now, now);
    return result.changes;
  }

  countQueue(status: ChannelQueueStatus): number {
    const row = this.db().prepare('SELECT COUNT(*) AS count FROM assistant_wait_queue WHERE status = ?').get(status) as { count: number };
    return row?.count ?? 0;
  }

  listQueue(status: ChannelQueueStatus): IChannelQueueEntry[] {
    const rows = this.db().prepare('SELECT * FROM assistant_wait_queue WHERE status = ? ORDER BY enqueued_at ASC, created_at ASC').all(status) as IChannelQueueEntryRow[];
    return rows.map(rowToChannelQueueEntry);
  }
}

export const isolationStore = new IsolationStore();
