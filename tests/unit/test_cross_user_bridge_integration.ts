/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { runWithBridgeRequestContext } from '@/process/bridge/bridgeRequestContext';

class TestBroadcastChannel {
  onmessage: ((event: { data: unknown }) => void) | null = null;

  constructor(_name: string) {}

  postMessage(_data: unknown): void {}

  close(): void {}
}

(global as unknown as { BroadcastChannel: typeof TestBroadcastChannel }).BroadcastChannel = TestBroadcastChannel;

type Conversation = {
  id: string;
  name: string;
  type: string;
  model: Record<string, unknown>;
  extra: Record<string, unknown>;
  status: string;
  createTime: number;
  modifyTime: number;
};

type Message = {
  id: string;
  conversation_id: string;
  msg_id: string;
  type: string;
  content: string;
  position: string;
  status: string;
  createdAt: number;
};

type CronJob = {
  id: string;
  name: string;
  enabled: boolean;
  schedule: {
    kind: 'every';
    everyMs: number;
    description: string;
  };
  target: {
    payload: {
      kind: 'message';
      text: string;
    };
  };
  metadata: {
    conversationId: string;
    agentType: string;
    createdBy: 'user' | 'agent';
    createdAt: number;
    updatedAt: number;
  };
  state: {
    runCount: number;
    retryCount: number;
    maxRetries: number;
  };
};

type CreateCronJobParams = {
  name: string;
  schedule: {
    kind: 'every';
    everyMs: number;
    description: string;
  };
  message: string;
  conversationId: string;
  agentType: string;
  createdBy: 'user' | 'agent';
};

interface MockProvider<Params, Result> {
  provider: (handler: (params: Params) => Promise<Result> | Result) => void;
  invoke: (params: Params) => Promise<Result>;
}

const createProvider = <Params, Result>(): MockProvider<Params, Result> => {
  let handler: ((params: Params) => Promise<Result> | Result) | undefined;
  return {
    provider(nextHandler) {
      handler = nextHandler;
    },
    invoke(params) {
      if (!handler) {
        return Promise.reject(new Error('provider is not registered'));
      }
      return Promise.resolve(handler(params));
    },
  };
};

const mockIpcBridge = {
  database: {
    getConversationMessages: createProvider<{ conversation_id: string; page?: number; pageSize?: number }, Message[]>(),
    getUserConversations: createProvider<{ page?: number; pageSize?: number }, Conversation[]>(),
  },
  cron: {
    listJobs: createProvider<void, CronJob[]>(),
    listJobsByConversation: createProvider<{ conversationId: string }, CronJob[]>(),
    getJob: createProvider<{ jobId: string }, CronJob | null>(),
    addJob: createProvider<CreateCronJobParams, CronJob>(),
    updateJob: createProvider<{ jobId: string; updates: Partial<CronJob> }, CronJob>(),
    removeJob: createProvider<{ jobId: string }, void>(),
    onJobCreated: { emit: jest.fn() },
    onJobUpdated: { emit: jest.fn() },
    onJobRemoved: { emit: jest.fn() },
  },
  acpConversation: {
    checkEnv: createProvider<void, { env: Record<string, string> }>(),
    detectCliPath: createProvider<{ backend: string }, { success: boolean; data?: { path: string }; msg?: string }>(),
    getAvailableAgents: createProvider<void, { success: boolean; data: unknown[] }>(),
    refreshCustomAgents: createProvider<void, { success: boolean; msg?: string }>(),
    checkAgentHealth: createProvider<{ backend: string }, { success: boolean; data?: unknown; msg?: string }>(),
    getMode: createProvider<{ conversationId: string }, { success: boolean; data?: { mode: string; initialized: boolean }; msg?: string }>(),
    setMode: createProvider<{ conversationId: string; mode: string }, { success: boolean; data?: { mode: string }; msg?: string }>(),
  },
};

const getDatabaseMock = jest.fn<() => MockDb>();
const processChatGetMock = jest.fn<(...args: unknown[]) => Promise<Conversation[]>>();
const migrateConversationToDatabaseMock = jest.fn<(...args: unknown[]) => Promise<void>>();

const cronListJobsMock = jest.fn<(...args: unknown[]) => Promise<CronJob[]>>();
const cronGetJobMock = jest.fn<(...args: unknown[]) => Promise<CronJob | null>>();
const cronAddJobMock = jest.fn<(...args: unknown[]) => Promise<CronJob>>();
const cronUpdateJobMock = jest.fn<(...args: unknown[]) => Promise<CronJob>>();
const cronRemoveJobMock = jest.fn<(...args: unknown[]) => Promise<void>>();

const getTaskByIdRollbackBuildMock = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const getDetectedAgentsMock = jest.fn<(...args: unknown[]) => Array<{ backend: string; cliPath?: string }>>();
const refreshCustomAgentsMock = jest.fn<(...args: unknown[]) => Promise<void>>();

jest.mock('@/common', () => ({
  ipcBridge: mockIpcBridge,
}));
jest.mock('../../src/common', () => ({
  ipcBridge: mockIpcBridge,
}));

jest.mock('@process/database', () => ({
  getDatabase: () => getDatabaseMock(),
}));

jest.mock('@/process/initStorage', () => ({
  ProcessChat: {
    get: (...args: unknown[]) => processChatGetMock(...args),
  },
}));
jest.mock('../../src/process/initStorage', () => ({
  ProcessChat: {
    get: (...args: unknown[]) => processChatGetMock(...args),
  },
}));

jest.mock('@/process/bridge/migrationUtils', () => ({
  migrateConversationToDatabase: (...args: unknown[]) => migrateConversationToDatabaseMock(...args),
}));
jest.mock('../../src/process/bridge/migrationUtils', () => ({
  migrateConversationToDatabase: (...args: unknown[]) => migrateConversationToDatabaseMock(...args),
}));

jest.mock('@process/services/cron/CronService', () => ({
  cronService: {
    listJobs: (...args: unknown[]) => cronListJobsMock(...args),
    listJobsByConversation: jest.fn(),
    getJob: (...args: unknown[]) => cronGetJobMock(...args),
    addJob: (...args: unknown[]) => cronAddJobMock(...args),
    updateJob: (...args: unknown[]) => cronUpdateJobMock(...args),
    removeJob: (...args: unknown[]) => cronRemoveJobMock(...args),
  },
}));

jest.mock('@/process/WorkerManage', () => ({
  __esModule: true,
  default: {
    getTaskByIdRollbackBuild: (...args: unknown[]) => getTaskByIdRollbackBuildMock(...args),
  },
}));

jest.mock('@/agent/acp/AcpDetector', () => ({
  acpDetector: {
    getDetectedAgents: (...args: unknown[]) => getDetectedAgentsMock(...args),
    refreshCustomAgents: (...args: unknown[]) => refreshCustomAgentsMock(...args),
  },
}));

jest.mock('@/agent/acp/AcpConnection', () => ({
  AcpConnection: class AcpConnectionMock {
    connect = async (): Promise<void> => undefined;
    newSession = async (): Promise<void> => undefined;
    sendPrompt = async (): Promise<void> => undefined;
    disconnect = (): void => undefined;
  },
}));

jest.mock('@/agent/codex/connection/CodexConnection', () => ({
  CodexConnection: class CodexConnectionMock {
    start = async (): Promise<void> => undefined;
    waitForServerReady = async (): Promise<void> => undefined;
    ping = async (): Promise<boolean> => true;
    stop = (): void => undefined;
  },
}));

import { initAcpConversationBridge } from '@/process/bridge/acpConversationBridge';
import { initCronBridge } from '@/process/bridge/cronBridge';
import { initDatabaseBridge } from '@/process/bridge/databaseBridge';

interface MockDb {
  getConversation: jest.Mock;
  getUserConversations: jest.Mock;
  getConversationMessages: jest.Mock;
}

const createConversation = (id: string, name: string): Conversation => ({
  id,
  name,
  type: 'acp',
  model: { id: 'provider-openai', useModel: 'gpt-4o-mini' },
  extra: {},
  status: 'finished',
  createTime: Date.now(),
  modifyTime: Date.now(),
});

const createMessage = (conversationId: string, msgId: string): Message => ({
  id: `${conversationId}-${msgId}`,
  conversation_id: conversationId,
  msg_id: msgId,
  type: 'text',
  content: `message-${msgId}`,
  position: 'left',
  status: 'success',
  createdAt: Date.now(),
});

const createCronJob = (id: string, conversationId: string): CronJob => ({
  id,
  name: `job-${id}`,
  enabled: true,
  schedule: { kind: 'every', everyMs: 60000, description: 'every minute' },
  target: { payload: { kind: 'message', text: 'hello' } },
  metadata: {
    conversationId,
    agentType: 'claude',
    createdBy: 'user',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  state: {
    runCount: 0,
    retryCount: 0,
    maxRetries: 0,
  },
});

const runAsWebsocketUser = async <T>(userId: string, callback: () => Promise<T>): Promise<T> => {
  return runWithBridgeRequestContext(
    {
      transport: 'websocket',
      userId,
      username: userId,
    },
    callback
  );
};

describe('cross-user bridge integration', () => {
  let dbMock: MockDb;

  beforeEach(() => {
    jest.clearAllMocks();

    const conversationA = createConversation('conv_a', 'Conversation A');
    const conversationB = createConversation('conv_b', 'Conversation B');
    const messageA = createMessage('conv_a', 'msg_a');
    const messageB = createMessage('conv_b', 'msg_b');

    const conversationOwnerMap: Record<string, string> = {
      conv_a: 'user_a',
      conv_b: 'user_b',
    };

    const conversationsByUser: Record<string, Conversation[]> = {
      user_a: [conversationA],
      user_b: [conversationB],
    };

    const messagesByConversation: Record<string, Message[]> = {
      conv_a: [messageA],
      conv_b: [messageB],
    };

    dbMock = {
      getConversation: jest.fn((conversationId: string, userId?: string) => {
        const owner = conversationOwnerMap[conversationId];
        if (!owner || (userId && owner !== userId)) {
          return { success: false, error: 'Conversation not found' };
        }
        return { success: true, data: conversationsByUser[owner]?.[0] };
      }),
      getUserConversations: jest.fn((userId?: string, page = 0, pageSize = 50) => {
        const data = userId ? conversationsByUser[userId] || [] : [conversationA, conversationB];
        return {
          data,
          total: data.length,
          page,
          pageSize,
          hasMore: false,
        };
      }),
      getConversationMessages: jest.fn((conversationId: string, page = 0, pageSize = 100, _order = 'ASC', userId?: string) => {
        const owner = conversationOwnerMap[conversationId];
        if (!owner || (userId && owner !== userId)) {
          return {
            data: [],
            total: 0,
            page,
            pageSize,
            hasMore: false,
          };
        }

        const data = messagesByConversation[conversationId] || [];
        return {
          data,
          total: data.length,
          page,
          pageSize,
          hasMore: false,
        };
      }),
    };

    getDatabaseMock.mockReturnValue(dbMock);

    processChatGetMock.mockResolvedValue([createConversation('file_only_conv', 'FileOnly')]);
    migrateConversationToDatabaseMock.mockResolvedValue(undefined);

    cronListJobsMock.mockResolvedValue([createCronJob('job_a', 'conv_a'), createCronJob('job_b', 'conv_b')]);
    cronGetJobMock.mockImplementation(async (jobId: string) => {
      if (jobId === 'job_a') {
        return createCronJob('job_a', 'conv_a');
      }
      if (jobId === 'job_b') {
        return createCronJob('job_b', 'conv_b');
      }
      return null;
    });
    cronAddJobMock.mockImplementation(async (params: CreateCronJobParams) => createCronJob('job_new', params.conversationId));
    cronUpdateJobMock.mockResolvedValue(createCronJob('job_a', 'conv_a'));
    cronRemoveJobMock.mockResolvedValue(undefined);

    getDetectedAgentsMock.mockReturnValue([]);
    refreshCustomAgentsMock.mockResolvedValue(undefined);
    getTaskByIdRollbackBuildMock.mockResolvedValue(undefined);

    initDatabaseBridge();
    initCronBridge();
    initAcpConversationBridge();
  });

  it('isolates database conversation list between user A and user B', async () => {
    const userAConversations = await runAsWebsocketUser('user_a', () => mockIpcBridge.database.getUserConversations.invoke({ page: 0, pageSize: 20 }));
    const userBConversations = await runAsWebsocketUser('user_b', () => mockIpcBridge.database.getUserConversations.invoke({ page: 0, pageSize: 20 }));

    expect(userAConversations.map((item) => item.id)).toEqual(['conv_a']);
    expect(userBConversations.map((item) => item.id)).toEqual(['conv_b']);
    expect(processChatGetMock).not.toHaveBeenCalled();
  });

  it('blocks cross-account message reads through database bridge', async () => {
    const result = await runAsWebsocketUser('user_b', () => mockIpcBridge.database.getConversationMessages.invoke({ conversation_id: 'conv_a', page: 0, pageSize: 10 }));

    expect(result).toEqual([]);
    expect(dbMock.getConversationMessages).toHaveBeenCalledWith('conv_a', 0, 10, 'ASC', 'user_b');
  });

  it('filters cron list/get results by conversation ownership', async () => {
    const userAJobs = await runAsWebsocketUser('user_a', () => mockIpcBridge.cron.listJobs.invoke(undefined));
    const userBReadsUserAJob = await runAsWebsocketUser('user_b', () => mockIpcBridge.cron.getJob.invoke({ jobId: 'job_a' }));

    expect(userAJobs.map((job) => job.id)).toEqual(['job_a']);
    expect(userBReadsUserAJob).toBeNull();
  });

  it('rejects cross-account cron creation while allowing owner creation', async () => {
    await expect(
      runAsWebsocketUser('user_b', () =>
        mockIpcBridge.cron.addJob.invoke({
          name: 'cross-user-job',
          schedule: { kind: 'every', everyMs: 60000, description: 'every minute' },
          message: 'hello',
          conversationId: 'conv_a',
          agentType: 'claude',
          createdBy: 'user',
        })
      )
    ).rejects.toThrow('Conversation not found');

    const created = await runAsWebsocketUser('user_a', () =>
      mockIpcBridge.cron.addJob.invoke({
        name: 'owner-job',
        schedule: { kind: 'every', everyMs: 60000, description: 'every minute' },
        message: 'hello',
        conversationId: 'conv_a',
        agentType: 'claude',
        createdBy: 'user',
      })
    );

    expect(created.metadata.conversationId).toBe('conv_a');
  });

  it('blocks cross-account acp mode requests before worker lookup', async () => {
    const denied = await runAsWebsocketUser('user_b', () => mockIpcBridge.acpConversation.getMode.invoke({ conversationId: 'conv_a' }));

    expect(denied).toEqual({ success: false, msg: 'Conversation not found' });
    expect(getTaskByIdRollbackBuildMock).not.toHaveBeenCalled();
  });
});
