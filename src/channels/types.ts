/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

// ==================== Plugin Types ====================

/**
 * Supported platform types for plugins
 * Legacy platform values are kept for compatibility with historical data.
 */
export type PluginType = 'telegram' | 'lark' | 'dingtalk' | 'slack' | 'discord';

/**
 * Plugin connection status
 */
export type PluginStatus = 'created' | 'initializing' | 'ready' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error';

/**
 * Plugin credentials (stored encrypted in database)
 * Legacy fields are kept for compatibility with historical configs.
 */
export interface IPluginCredentials {
  token?: string;
  appId?: string;
  appSecret?: string;
  encryptKey?: string;
  verificationToken?: string;
  clientId?: string;
  clientSecret?: string;
}

/**
 * Check whether a plugin has valid credentials configured.
 */
export function hasPluginCredentials(type: PluginType, credentials?: IPluginCredentials): boolean {
  if (!credentials) return false;
  if (type === 'lark') return Boolean(credentials.appId && credentials.appSecret);
  if (type === 'dingtalk') return Boolean(credentials.clientId && credentials.clientSecret);
  return !!credentials.token;
}

/**
 * Plugin configuration options
 */
export interface IPluginConfigOptions {
  mode?: 'polling' | 'webhook' | 'websocket';
  webhookUrl?: string;
  rateLimit?: number; // Max messages per minute
  requireMention?: boolean; // Require @mention in groups
}

/**
 * Plugin configuration stored in database
 */
export interface IChannelPluginConfig {
  id: string;
  type: PluginType;
  name: string;
  enabled: boolean;
  credentials?: IPluginCredentials;
  config?: IPluginConfigOptions;
  status: PluginStatus;
  lastConnected?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Plugin status for IPC communication
 */
export interface IChannelPluginStatus {
  id: string;
  type: PluginType;
  name: string;
  enabled: boolean;
  connected: boolean;
  status: PluginStatus;
  lastConnected?: number;
  error?: string;
  activeUsers: number;
  botUsername?: string;
  /** Whether the plugin has a token configured (token itself is not exposed for security) */
  hasToken?: boolean;
}

// ==================== User Types ====================

/**
 * Authorized user in the assistant system
 */
export interface IChannelUser {
  id: string;
  platformUserId: string;
  platformType: PluginType;
  displayName?: string;
  authorizedAt: number;
  lastActive?: number;
  sessionId?: string;
}

/**
 * Database row for assistant users
 */
export interface IChannelUserRow {
  id: string;
  platform_user_id: string;
  platform_type: string;
  display_name: string | null;
  authorized_at: number;
  last_active: number | null;
  session_id: string | null;
}

// ==================== Session Types ====================

/**
 * Agent types supported in assistant sessions
 */
export type ChannelAgentType = 'gemini' | 'acp' | 'codex' | 'openclaw-gateway';

/**
 * User session in the assistant system
 */
export interface IChannelSession {
  id: string;
  userId: string;
  agentType: ChannelAgentType;
  conversationId?: string;
  workspace?: string;
  chatId?: string; // Channel chat isolation ID (e.g. user:xxx, group:xxx)
  createdAt: number;
  lastActivity: number;
}

/**
 * Database row for assistant sessions
 */
export interface IChannelSessionRow {
  id: string;
  user_id: string;
  agent_type: string;
  conversation_id: string | null;
  workspace: string | null;
  chat_id: string | null; // Channel chat isolation ID
  created_at: number;
  last_activity: number;
}

// ==================== Pairing Types ====================

/**
 * Pairing request status
 */
export type PairingStatus = 'pending' | 'approved' | 'rejected' | 'expired';

/**
 * Pending pairing request
 */
export interface IChannelPairingRequest {
  code: string;
  platformUserId: string;
  platformType: PluginType;
  displayName?: string;
  requestedAt: number;
  expiresAt: number;
  status: PairingStatus;
}

/**
 * Database row for pairing codes
 */
export interface IChannelPairingCodeRow {
  code: string;
  platform_user_id: string;
  platform_type: string;
  display_name: string | null;
  requested_at: number;
  expires_at: number;
  status: string;
}

// ==================== Isolation Types ====================

/**
 * Isolation config row ID.
 * Current design supports a single global config row.
 */
export type ChannelIsolationConfigId = 'default';

/**
 * Active lease status for global slot management.
 */
export type ChannelLeaseStatus = 'active' | 'released' | 'expired';

/**
 * Wait queue status for users waiting for an active slot.
 */
export type ChannelQueueStatus = 'waiting' | 'admitted' | 'cancelled' | 'timed_out';

/**
 * Offline job status lifecycle.
 */
export type ChannelOfflineJobStatus = 'queued' | 'running' | 'retry_wait' | 'completed' | 'failed' | 'cancelled';

/**
 * Global isolation and limit configuration.
 */
export interface IChannelIsolationConfig {
  id: ChannelIsolationConfigId;
  maxActiveUsers: number;
  heartbeatTimeoutMs: number;
  queueTimeoutMs: number;
  maxQueueSize: number;
  maxOfflineJobsPerUser: number;
  defaultUserQuotaBytes: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Database row for global isolation config.
 */
export interface IChannelIsolationConfigRow {
  id: string;
  max_active_users: number;
  heartbeat_timeout_ms: number;
  queue_timeout_ms: number;
  max_queue_size: number;
  max_offline_jobs_per_user: number;
  default_user_quota_bytes: number;
  created_at: number;
  updated_at: number;
}

/**
 * Active lease for users currently occupying global active slots.
 */
export interface IChannelActiveLease {
  id: string;
  userId: string;
  platformType: PluginType;
  platformUserId: string;
  chatId: string;
  acquiredAt: number;
  lastHeartbeatAt: number;
  expiresAt: number;
  status: ChannelLeaseStatus;
  releaseReason?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Database row for active lease records.
 */
export interface IChannelActiveLeaseRow {
  id: string;
  user_id: string;
  platform_type: string;
  platform_user_id: string;
  chat_id: string;
  acquired_at: number;
  last_heartbeat_at: number;
  expires_at: number;
  status: string;
  release_reason: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * Wait queue entry for users waiting for a global active slot.
 */
export interface IChannelQueueEntry {
  id: string;
  userId: string;
  platformType: PluginType;
  platformUserId: string;
  chatId: string;
  enqueuedAt: number;
  lastNotifiedAt?: number;
  status: ChannelQueueStatus;
  admittedAt?: number;
  expiresAt?: number;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Database row for wait queue entries.
 */
export interface IChannelQueueEntryRow {
  id: string;
  user_id: string;
  platform_type: string;
  platform_user_id: string;
  chat_id: string;
  enqueued_at: number;
  last_notified_at: number | null;
  status: string;
  admitted_at: number | null;
  expires_at: number | null;
  note: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * Persistent offline job record.
 */
export interface IChannelOfflineJob {
  id: string;
  userId: string;
  conversationId?: string;
  chatId: string;
  payloadType: 'message';
  payloadText: string;
  priority: number;
  status: ChannelOfflineJobStatus;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt?: number;
  lastError?: string;
  startedAt?: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Database row for persistent offline jobs.
 */
export interface IChannelOfflineJobRow {
  id: string;
  user_id: string;
  conversation_id: string | null;
  chat_id: string;
  payload_type: string;
  payload_text: string;
  priority: number;
  status: string;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at: number | null;
  last_error: string | null;
  started_at: number | null;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
}

/**
 * Per-user storage quota and usage snapshot.
 */
export interface IChannelUserStorageQuota {
  userId: string;
  quotaBytes: number;
  usedBytes: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Database row for per-user storage quota.
 */
export interface IChannelUserStorageQuotaRow {
  user_id: string;
  quota_bytes: number;
  used_bytes: number;
  created_at: number;
  updated_at: number;
}

/**
 * Identity tuple used by access gate APIs.
 */
export interface IChannelAccessIdentity {
  userId: string;
  platformType: PluginType;
  platformUserId: string;
  chatId: string;
}

/**
 * Result of access gate join request.
 */
export interface IChannelGateJoinResult {
  decision: 'admitted' | 'queued' | 'rejected';
  leaseId?: string;
  queueEntryId?: string;
  queuePosition?: number;
  reason?: string;
  expiresAt?: number;
  activeCount: number;
  maxActiveUsers: number;
  queueSize: number;
  maxQueueSize: number;
}

/**
 * Result of access gate heartbeat request.
 */
export interface IChannelGateHeartbeatResult {
  success: boolean;
  leaseId?: string;
  expiresAt?: number;
  reason?: string;
}

/**
 * Result of access gate leave request.
 */
export interface IChannelGateLeaveResult {
  released: boolean;
  leaseId?: string;
  reason?: string;
  promoted?: {
    userId: string;
    chatId: string;
    leaseId: string;
    queueEntryId: string;
  };
}

/**
 * User-centric access gate status projection.
 */
export interface IChannelGateUserState {
  state: 'active' | 'waiting' | 'none';
  leaseId?: string;
  queueEntryId?: string;
  queuePosition?: number;
  expiresAt?: number;
}

/**
 * Aggregated access gate status.
 */
export interface IChannelGateStatus {
  activeCount: number;
  maxActiveUsers: number;
  availableSlots: number;
  queueSize: number;
  maxQueueSize: number;
  heartbeatTimeoutMs: number;
  queueTimeoutMs: number;
  user?: IChannelGateUserState;
}

// ==================== Message Types ====================

/**
 * Content types for unified messages
 */
export type MessageContentType = 'text' | 'photo' | 'document' | 'voice' | 'audio' | 'video' | 'sticker' | 'action' | 'command';

/**
 * Unified user information across platforms
 */
export interface IUnifiedUser {
  id: string;
  username?: string;
  displayName: string;
  avatarUrl?: string;
}

/**
 * Attachment types for messages
 */
export type AttachmentType = 'photo' | 'document' | 'voice' | 'audio' | 'video' | 'sticker';

/**
 * Unified attachment information
 */
export interface IUnifiedAttachment {
  type: AttachmentType;
  fileId: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  duration?: number;
}

/**
 * Unified message content
 */
export interface IUnifiedMessageContent {
  type: MessageContentType;
  text: string;
  attachments?: IUnifiedAttachment[];
}

/**
 * Unified action in a message
 */
export interface IMessageAction {
  type: ActionCategory;
  name: string;
  params?: Record<string, string>;
}

/**
 * Unified incoming message format (Platform -> System)
 */
export interface IUnifiedIncomingMessage {
  id: string;
  platform: PluginType;
  chatId: string;
  user: IUnifiedUser;
  content: IUnifiedMessageContent;
  timestamp: number;
  replyToMessageId?: string;
  action?: IMessageAction;
  raw?: unknown;
}

/**
 * Parse mode for outgoing messages
 */
export type MessageParseMode = 'plain' | 'markdown' | 'html';

/**
 * Button for inline keyboards
 */
export interface IActionButton {
  label: string;
  action: string;
  params?: Record<string, string>;
}

/**
 * Unified outgoing message format (System -> Platform)
 */
export interface IUnifiedOutgoingMessage {
  type: 'text' | 'image' | 'file' | 'buttons';
  text?: string;
  parseMode?: 'HTML' | 'MarkdownV2' | 'Markdown';
  buttons?: IActionButton[][];
  keyboard?: IActionButton[][];
  replyMarkup?: unknown;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  replyToMessageId?: string;
  silent?: boolean;
}

/**
 * Bot information for display
 */
export interface BotInfo {
  id: string;
  username?: string;
  displayName: string;
}

// ==================== Action Types ====================

/**
 * Action categories
 */
export type ActionCategory = 'platform' | 'system' | 'chat';

/**
 * Unified action structure
 */
export interface IUnifiedAction {
  action: string;
  category: ActionCategory;
  params?: Record<string, string>;
  context: {
    platform: PluginType;
    userId: string;
    chatId: string;
    messageId?: string;
    sessionId?: string;
  };
}

/**
 * Response behavior for actions
 */
export type ActionResponseBehavior = 'send' | 'edit' | 'answer';

/**
 * Unified action response
 */
export interface IActionResponse {
  text?: string;
  parseMode?: MessageParseMode;
  buttons?: IActionButton[][];
  keyboard?: IActionButton[][];
  behavior: ActionResponseBehavior;
  toast?: string;
  editMessageId?: string;
}

// ==================== Agent Response Types ====================

/**
 * Agent response types for streaming
 */
export type AgentResponseType = 'text' | 'stream_start' | 'stream_chunk' | 'stream_end' | 'error';

/**
 * Agent response structure
 */
export interface IAgentResponse {
  type: AgentResponseType;
  text?: string;
  chunk?: string;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    model?: string;
    tokensUsed?: number;
    duration?: number;
  };
  suggestedActions?: IActionButton[];
}

// ==================== Type Conversion Helpers ====================

/**
 * Convert database row to IChannelUser
 */
export function rowToChannelUser(row: IChannelUserRow): IChannelUser {
  return {
    id: row.id,
    platformUserId: row.platform_user_id,
    platformType: row.platform_type as PluginType,
    displayName: row.display_name ?? undefined,
    authorizedAt: row.authorized_at,
    lastActive: row.last_active ?? undefined,
    sessionId: row.session_id ?? undefined,
  };
}

/**
 * Convert IChannelUser to database row
 */
export function channelUserToRow(user: IChannelUser): IChannelUserRow {
  return {
    id: user.id,
    platform_user_id: user.platformUserId,
    platform_type: user.platformType,
    display_name: user.displayName ?? null,
    authorized_at: user.authorizedAt,
    last_active: user.lastActive ?? null,
    session_id: user.sessionId ?? null,
  };
}

/**
 * Convert database row to IChannelSession
 */
export function rowToChannelSession(row: IChannelSessionRow): IChannelSession {
  return {
    id: row.id,
    userId: row.user_id,
    agentType: row.agent_type as ChannelAgentType,
    conversationId: row.conversation_id ?? undefined,
    workspace: row.workspace ?? undefined,
    chatId: row.chat_id ?? undefined,
    createdAt: row.created_at,
    lastActivity: row.last_activity,
  };
}

/**
 * Convert IChannelSession to database row
 */
export function channelSessionToRow(session: IChannelSession): IChannelSessionRow {
  return {
    id: session.id,
    user_id: session.userId,
    agent_type: session.agentType,
    conversation_id: session.conversationId ?? null,
    workspace: session.workspace ?? null,
    chat_id: session.chatId ?? null,
    created_at: session.createdAt,
    last_activity: session.lastActivity,
  };
}

/**
 * Convert database row to IChannelPairingRequest
 */
export function rowToPairingRequest(row: IChannelPairingCodeRow): IChannelPairingRequest {
  return {
    code: row.code,
    platformUserId: row.platform_user_id,
    platformType: row.platform_type as PluginType,
    displayName: row.display_name ?? undefined,
    requestedAt: row.requested_at,
    expiresAt: row.expires_at,
    status: row.status as PairingStatus,
  };
}

/**
 * Convert IChannelPairingRequest to database row
 */
export function pairingRequestToRow(request: IChannelPairingRequest): IChannelPairingCodeRow {
  return {
    code: request.code,
    platform_user_id: request.platformUserId,
    platform_type: request.platformType,
    display_name: request.displayName ?? null,
    requested_at: request.requestedAt,
    expires_at: request.expiresAt,
    status: request.status,
  };
}

/**
 * Convert database row to IChannelIsolationConfig
 */
export function rowToChannelIsolationConfig(row: IChannelIsolationConfigRow): IChannelIsolationConfig {
  return {
    id: row.id as ChannelIsolationConfigId,
    maxActiveUsers: row.max_active_users,
    heartbeatTimeoutMs: row.heartbeat_timeout_ms,
    queueTimeoutMs: row.queue_timeout_ms,
    maxQueueSize: row.max_queue_size,
    maxOfflineJobsPerUser: row.max_offline_jobs_per_user,
    defaultUserQuotaBytes: row.default_user_quota_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert IChannelIsolationConfig to database row
 */
export function channelIsolationConfigToRow(config: IChannelIsolationConfig): IChannelIsolationConfigRow {
  return {
    id: config.id,
    max_active_users: config.maxActiveUsers,
    heartbeat_timeout_ms: config.heartbeatTimeoutMs,
    queue_timeout_ms: config.queueTimeoutMs,
    max_queue_size: config.maxQueueSize,
    max_offline_jobs_per_user: config.maxOfflineJobsPerUser,
    default_user_quota_bytes: config.defaultUserQuotaBytes,
    created_at: config.createdAt,
    updated_at: config.updatedAt,
  };
}

/**
 * Convert database row to IChannelActiveLease
 */
export function rowToChannelActiveLease(row: IChannelActiveLeaseRow): IChannelActiveLease {
  return {
    id: row.id,
    userId: row.user_id,
    platformType: row.platform_type as PluginType,
    platformUserId: row.platform_user_id,
    chatId: row.chat_id,
    acquiredAt: row.acquired_at,
    lastHeartbeatAt: row.last_heartbeat_at,
    expiresAt: row.expires_at,
    status: row.status as ChannelLeaseStatus,
    releaseReason: row.release_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert IChannelActiveLease to database row
 */
export function channelActiveLeaseToRow(lease: IChannelActiveLease): IChannelActiveLeaseRow {
  return {
    id: lease.id,
    user_id: lease.userId,
    platform_type: lease.platformType,
    platform_user_id: lease.platformUserId,
    chat_id: lease.chatId,
    acquired_at: lease.acquiredAt,
    last_heartbeat_at: lease.lastHeartbeatAt,
    expires_at: lease.expiresAt,
    status: lease.status,
    release_reason: lease.releaseReason ?? null,
    created_at: lease.createdAt,
    updated_at: lease.updatedAt,
  };
}

/**
 * Convert database row to IChannelQueueEntry
 */
export function rowToChannelQueueEntry(row: IChannelQueueEntryRow): IChannelQueueEntry {
  return {
    id: row.id,
    userId: row.user_id,
    platformType: row.platform_type as PluginType,
    platformUserId: row.platform_user_id,
    chatId: row.chat_id,
    enqueuedAt: row.enqueued_at,
    lastNotifiedAt: row.last_notified_at ?? undefined,
    status: row.status as ChannelQueueStatus,
    admittedAt: row.admitted_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert IChannelQueueEntry to database row
 */
export function channelQueueEntryToRow(entry: IChannelQueueEntry): IChannelQueueEntryRow {
  return {
    id: entry.id,
    user_id: entry.userId,
    platform_type: entry.platformType,
    platform_user_id: entry.platformUserId,
    chat_id: entry.chatId,
    enqueued_at: entry.enqueuedAt,
    last_notified_at: entry.lastNotifiedAt ?? null,
    status: entry.status,
    admitted_at: entry.admittedAt ?? null,
    expires_at: entry.expiresAt ?? null,
    note: entry.note ?? null,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  };
}

/**
 * Convert database row to IChannelOfflineJob
 */
export function rowToChannelOfflineJob(row: IChannelOfflineJobRow): IChannelOfflineJob {
  return {
    id: row.id,
    userId: row.user_id,
    conversationId: row.conversation_id ?? undefined,
    chatId: row.chat_id,
    payloadType: row.payload_type as 'message',
    payloadText: row.payload_text,
    priority: row.priority,
    status: row.status as ChannelOfflineJobStatus,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    nextAttemptAt: row.next_attempt_at ?? undefined,
    lastError: row.last_error ?? undefined,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert IChannelOfflineJob to database row
 */
export function channelOfflineJobToRow(job: IChannelOfflineJob): IChannelOfflineJobRow {
  return {
    id: job.id,
    user_id: job.userId,
    conversation_id: job.conversationId ?? null,
    chat_id: job.chatId,
    payload_type: job.payloadType,
    payload_text: job.payloadText,
    priority: job.priority,
    status: job.status,
    attempt_count: job.attemptCount,
    max_attempts: job.maxAttempts,
    next_attempt_at: job.nextAttemptAt ?? null,
    last_error: job.lastError ?? null,
    started_at: job.startedAt ?? null,
    completed_at: job.completedAt ?? null,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  };
}

/**
 * Convert database row to IChannelUserStorageQuota
 */
export function rowToChannelUserStorageQuota(row: IChannelUserStorageQuotaRow): IChannelUserStorageQuota {
  return {
    userId: row.user_id,
    quotaBytes: row.quota_bytes,
    usedBytes: row.used_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert IChannelUserStorageQuota to database row
 */
export function channelUserStorageQuotaToRow(quota: IChannelUserStorageQuota): IChannelUserStorageQuotaRow {
  return {
    user_id: quota.userId,
    quota_bytes: quota.quotaBytes,
    used_bytes: quota.usedBytes,
    created_at: quota.createdAt,
    updated_at: quota.updatedAt,
  };
}

// ==================== Channel Platform Helpers ====================

/**
 * Channel platform type for model configuration.
 * Legacy channel platforms are still recognized for compatibility.
 */
export type ChannelPlatform = 'telegram' | 'lark' | 'dingtalk' | 'slack' | 'discord';

/**
 * Type guard to check if a string is a valid ChannelPlatform
 */
export function isChannelPlatform(value: string): value is ChannelPlatform {
  return value === 'telegram' || value === 'lark' || value === 'dingtalk' || value === 'slack' || value === 'discord';
}

/**
 * Resolve a backend string to conversation type and optional backend qualifier.
 * Centralizes the backend -> convType mapping used across channels.
 */
export function resolveChannelConvType(backend: string): { convType: string; convBackend?: string } {
  if (backend === 'codex') return { convType: 'codex' };
  if (backend === 'gemini') return { convType: 'gemini' };
  if (backend === 'openclaw-gateway') return { convType: 'openclaw-gateway' };
  return { convType: 'acp', convBackend: backend };
}

/**
 * Build a structured conversation name for a channel platform.
 * Third-party channel plugins have been removed.
 */
export function getChannelConversationName(platform: string, type?: string, backend?: string, chatId?: string): string {
  const parts: string[] = [platform];
  if (type) parts.push(type);
  if (type === 'acp' && backend) parts.push(backend);
  if (chatId) parts.push(chatId.slice(0, 8));
  return parts.join('-');
}
