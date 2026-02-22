/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CodexAgentManager } from '@/agent/codex';
import type { TChatConversation } from '@/common/storage';
import { getDatabase } from '@process/database';
import { cronService } from '@process/services/cron/CronService';
import { ipcBridge } from '../../common';
import { uuid } from '../../common/utils';
import { ProcessChat } from '../initStorage';
import { ConversationService } from '../services/conversationService';
import type AcpAgentManager from '../task/AcpAgentManager';
import type NanoBotAgentManager from '../task/NanoBotAgentManager';
import type OpenClawAgentManager from '../task/OpenClawAgentManager';
import { copyFilesToDirectory, readDirectoryRecursive } from '../utils';
import { computeOpenClawIdentityHash } from '../utils/openclawUtils';
import WorkerManage from '../WorkerManage';
import { getBridgeRequestUserId } from './bridgeRequestContext';
import { canAccessConversation } from './conversationAccess';
import { migrateConversationToDatabase } from './migrationUtils';

export function initConversationBridge(): void {
  ipcBridge.openclawConversation.getRuntime.provider(async ({ conversation_id }) => {
    try {
      const db = getDatabase();
      const convResult = db.getConversation(conversation_id, getBridgeRequestUserId());
      if (!convResult.success || !convResult.data || convResult.data.type !== 'openclaw-gateway') {
        return { success: false, msg: 'OpenClaw conversation not found' };
      }
      const conversation = convResult.data;
      const task = (await WorkerManage.getTaskByIdRollbackBuild(conversation_id)) as OpenClawAgentManager | undefined;
      if (!task || task.type !== 'openclaw-gateway') {
        return { success: false, msg: 'OpenClaw runtime not available' };
      }

      // Await bootstrap to ensure the agent is fully connected before returning runtime info.
      // Without this, getRuntime may return isConnected=false while the agent is still connecting.
      await task.bootstrap.catch(() => {});

      const diagnostics = task.getDiagnostics();
      const identityHash = await computeOpenClawIdentityHash(diagnostics.workspace || conversation.extra?.workspace);
      const conversationModel = (conversation as { model?: { useModel?: string } }).model;
      const extra = conversation.extra as { cliPath?: string; gateway?: { cliPath?: string }; runtimeValidation?: unknown } | undefined;
      const gatewayCliPath = extra?.gateway?.cliPath;

      return {
        success: true,
        data: {
          conversationId: conversation_id,
          runtime: {
            workspace: diagnostics.workspace || conversation.extra?.workspace,
            backend: diagnostics.backend || conversation.extra?.backend,
            agentName: diagnostics.agentName || conversation.extra?.agentName,
            cliPath: diagnostics.cliPath || extra?.cliPath || gatewayCliPath,
            model: conversationModel?.useModel,
            sessionKey: diagnostics.sessionKey,
            isConnected: diagnostics.isConnected,
            hasActiveSession: diagnostics.hasActiveSession,
            identityHash,
          },
          expected: extra?.runtimeValidation,
        },
      };
    } catch (error) {
      return { success: false, msg: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcBridge.conversation.create.provider(async (params): Promise<TChatConversation> => {
    const userId = getBridgeRequestUserId();
    // 浣跨敤 ConversationService 鍒涘缓浼氳瘽 / Use ConversationService to create conversation
    const result = await ConversationService.createConversation({
      ...params,
      userId,
      source: 'aionui', // AionUI 鍒涘缓鐨勪細璇濇爣璁颁负 aionui / Mark conversations created by AionUI as aionui
    });

    if (!result.success || !result.conversation) {
      throw new Error(result.error || 'Failed to create conversation');
    }

    return result.conversation;
  });

  // Manual reload is kept for API compatibility, but no longer supported.
  ipcBridge.conversation.reloadContext.provider(async ({ conversation_id }) => {
    if (!canAccessConversation(conversation_id)) {
      return { success: false, msg: 'conversation not found' };
    }
    const task = WorkerManage.getTaskById(conversation_id);
    if (!task) return { success: false, msg: 'conversation not found' };
    return { success: false, msg: 'reload context is not supported for this agent type' };
  });

  ipcBridge.conversation.getAssociateConversation.provider(async ({ conversation_id }) => {
    try {
      const db = getDatabase();
      const userId = getBridgeRequestUserId();

      // Try to get current conversation from database
      let currentConversation: TChatConversation | undefined;
      const currentResult = db.getConversation(conversation_id, userId);

      if (currentResult.success && currentResult.data) {
        currentConversation = currentResult.data;
      } else {
        if (userId) {
          return [];
        }
        // Not in database, try file storage
        const history = await ProcessChat.get('chat.history');
        currentConversation = (history || []).find((item) => item.id === conversation_id);

        // Lazy migrate in background
        if (currentConversation) {
          void migrateConversationToDatabase(currentConversation);
        }
      }

      if (!currentConversation || !currentConversation.extra?.workspace) {
        return [];
      }

      // Get all conversations from database (get first page with large limit to get all)
      const allResult = db.getUserConversations(userId, 0, 10000);
      let allConversations: TChatConversation[] = allResult.data || [];

      if (userId) {
        return allConversations.filter((item) => item.extra?.workspace === currentConversation.extra.workspace);
      }

      // If database is empty or doesn't have enough conversations, merge with file storage
      const history = await ProcessChat.get('chat.history');
      if (allConversations.length < (history?.length || 0)) {
        // Database doesn't have all conversations yet, use file storage
        allConversations = history || [];

        // Lazy migrate all conversations in background
        void Promise.all(allConversations.map((conv) => migrateConversationToDatabase(conv)));
      }

      // Filter by workspace
      return allConversations.filter((item) => item.extra?.workspace === currentConversation.extra.workspace);
    } catch (error) {
      console.error('[conversationBridge] Failed to get associate conversations:', error);
      return [];
    }
  });

  ipcBridge.conversation.createWithConversation.provider(({ conversation, sourceConversationId }) => {
    try {
      const userId = getBridgeRequestUserId();
      conversation.createTime = Date.now();
      conversation.modifyTime = Date.now();
      WorkerManage.buildConversation(conversation);

      // Save to database only
      const db = getDatabase();
      const result = db.createConversation(conversation, userId);
      if (!result.success) {
        console.error('[conversationBridge] Failed to create conversation in database:', result.error);
      }

      // Migrate messages if sourceConversationId is provided / 濡傛灉鎻愪緵浜嗘簮浼氳瘽ID锛屽垯杩佺Щ娑堟伅
      if (sourceConversationId && result.success) {
        try {
          // Fetch all messages from source conversation (paged)
          const pageSize = 10000;
          let page = 0;
          let hasMore = true;

          while (hasMore) {
            const messagesResult = db.getConversationMessages(sourceConversationId, page, pageSize, 'ASC', userId);
            const messages = messagesResult.data;

            for (const msg of messages) {
              // Create a copy of the message with new ID and new conversation ID / 鍒涘缓娑堟伅鍓湰锛屼娇鐢ㄦ柊 ID 鍜屾柊浼氳瘽 ID
              const newMessage = {
                ...msg,
                id: uuid(), // Generate new ID / 鐢熸垚鏂?ID
                conversation_id: conversation.id,
                createdAt: msg.createdAt || Date.now(),
              };
              db.insertMessage(newMessage);
            }

            hasMore = messagesResult.hasMore;
            page++;
          }

          // Verify integrity and remove source conversation
          const sourceMessages = db.getConversationMessages(sourceConversationId, 0, 1, 'ASC', userId);
          const newMessages = db.getConversationMessages(conversation.id, 0, 1, 'ASC', userId);

          if (sourceMessages.total === newMessages.total) {
            // Verification passed, delete source conversation / 鏍￠獙閫氳繃锛屽垹闄ゆ簮浼氳瘽
            // ON DELETE CASCADE will handle message deletion
            const deleteResult = db.deleteConversation(sourceConversationId, userId);
            if (deleteResult.success && deleteResult.data) {
              console.log(`[conversationBridge] Successfully migrated and deleted source conversation ${sourceConversationId}`);
            } else {
              console.error(`[conversationBridge] Failed to delete source conversation ${sourceConversationId}: ${deleteResult.error}`);
            }
          } else {
            console.error('[conversationBridge] Migration integrity check failed: Message counts do not match.', {
              source: sourceMessages.total,
              new: newMessages.total,
            });
            // Do not delete source if verification fails
          }
        } catch (msgError) {
          console.error('[conversationBridge] Failed to copy messages during migration:', msgError);
        }
      }

      return Promise.resolve(conversation);
    } catch (error) {
      console.error('[conversationBridge] Failed to create conversation with conversation:', error);
      return Promise.resolve(conversation);
    }
  });

  ipcBridge.conversation.remove.provider(async ({ id }) => {
    try {
      const db = getDatabase();
      const userId = getBridgeRequestUserId();

      // Get conversation to check source before deletion
      const convResult = db.getConversation(id, userId);
      if (!convResult.success || !convResult.data) {
        return false;
      }
      const conversation = convResult.data;
      const source = conversation?.source;

      // Kill the running task if exists
      WorkerManage.kill(id);

      // Delete associated cron jobs
      try {
        const jobs = await cronService.listJobsByConversation(id);
        for (const job of jobs) {
          await cronService.removeJob(job.id);
          ipcBridge.cron.onJobRemoved.emit({ jobId: job.id });
        }
      } catch (cronError) {
        console.warn('[conversationBridge] Failed to cleanup cron jobs:', cronError);
        // Continue with deletion even if cron cleanup fails
      }

      // If source is not 'aionui' (e.g., telegram), cleanup channel resources
      // 濡傛灉鏉ユ簮涓嶆槸 aionui锛堝 telegram锛夛紝闇€瑕佹竻鐞?channel 鐩稿叧璧勬簮
      if (source && source !== 'aionui') {
        try {
          // Dynamic import to avoid circular dependency
          const { getChannelManager } = await import('@/channels/core/ChannelManager');
          const channelManager = getChannelManager();
          if (channelManager.isInitialized()) {
            await channelManager.cleanupConversation(id);
            console.log(`[conversationBridge] Cleaned up channel resources for ${source} conversation ${id}`);
          }
        } catch (cleanupError) {
          console.warn('[conversationBridge] Failed to cleanup channel resources:', cleanupError);
          // Continue with deletion even if cleanup fails
        }
      }

      // Delete conversation from database (will cascade delete messages due to foreign key)
      const result = db.deleteConversation(id, userId);
      if (!result.success) {
        console.error('[conversationBridge] Failed to delete conversation from database:', result.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[conversationBridge] Failed to remove conversation:', error);
      return false;
    }
  });

  ipcBridge.conversation.update.provider(async ({ id, updates, mergeExtra }: { id: string; updates: Partial<TChatConversation>; mergeExtra?: boolean }) => {
    try {
      const db = getDatabase();
      const userId = getBridgeRequestUserId();
      const existing = db.getConversation(id, userId);
      // Only gemini type has model, use 'in' check to safely access
      const prevModel = existing.success && existing.data && 'model' in existing.data ? existing.data.model : undefined;
      const nextModel = 'model' in updates ? updates.model : undefined;
      const modelChanged = !!nextModel && JSON.stringify(prevModel) !== JSON.stringify(nextModel);
      // model change detection for task rebuild

      // Merge extra fields when requested instead of replacing them
      let finalUpdates = updates;
      if (mergeExtra && updates.extra && existing.success && existing.data) {
        finalUpdates = {
          ...updates,
          extra: {
            ...existing.data.extra,
            ...updates.extra,
          },
        } as Partial<TChatConversation>;
      }

      const result = await Promise.resolve(db.updateConversation(id, finalUpdates, userId));

      // If model changed, kill running task to force rebuild with new model on next send
      if (result.success && modelChanged) {
        try {
          WorkerManage.kill(id);
        } catch (killErr) {
          // ignore kill error, will lazily rebuild later
        }
      }

      return result.success;
    } catch (error) {
      console.error('[conversationBridge] Failed to update conversation:', error);
      return false;
    }
  });

  ipcBridge.conversation.reset.provider(({ id }) => {
    if (id) {
      if (!canAccessConversation(id)) {
        return Promise.resolve();
      }
      WorkerManage.kill(id);
    } else {
      if (getBridgeRequestUserId()) {
        return Promise.resolve();
      }
      WorkerManage.clear();
    }
    return Promise.resolve();
  });

  ipcBridge.conversation.get.provider(async ({ id }) => {
    try {
      const db = getDatabase();
      const userId = getBridgeRequestUserId();

      // Try to get conversation from database first
      const result = db.getConversation(id, userId);
      if (result.success && result.data) {
        // Found in database, update status and return
        const conversation = result.data;
        const task = WorkerManage.getTaskById(id);
        conversation.status = task?.status || 'finished';
        return conversation;
      }

      if (userId) {
        return undefined;
      }

      // Not in database, try to load from file storage and migrate
      const history = await ProcessChat.get('chat.history');
      const conversation = (history || []).find((item) => item.id === id);
      if (conversation) {
        // Update status from running task
        const task = WorkerManage.getTaskById(id);
        conversation.status = task?.status || 'finished';

        // Lazy migrate this conversation to database in background
        void migrateConversationToDatabase(conversation);

        return conversation;
      }

      return undefined;
    } catch (error) {
      console.error('[conversationBridge] Failed to get conversation:', error);
      return undefined;
    }
  });

  const buildLastAbortController = (() => {
    let lastGetWorkspaceAbortController = new AbortController();
    return () => {
      lastGetWorkspaceAbortController.abort();
      return (lastGetWorkspaceAbortController = new AbortController());
    };
  })();

  ipcBridge.conversation.getWorkspace.provider(async ({ conversation_id, workspace, search, path }) => {
    if (conversation_id && !canAccessConversation(conversation_id)) {
      return [];
    }
    try {
      return await readDirectoryRecursive(path, {
        root: workspace,
        fileService: { shouldIgnoreFile: () => false },
        abortController: buildLastAbortController(),
        maxDepth: 10, // 鏀寔鏇存繁鐨勭洰褰曠粨鏋?/ Support deeper directory structures
        search: {
          text: search,
          onProcess(result) {
            void ipcBridge.conversation.responseSearchWorkSpace.invoke(result);
          },
        },
      }).then((res) => (res ? [res] : []));
    } catch (error) {
      // 鎹曡幏 abort 閿欒锛岄伩鍏?unhandled rejection
      // Catch abort errors to avoid unhandled rejection
      if (error instanceof Error && error.message.includes('aborted')) {
        console.log('[Workspace] Read directory aborted:', error.message);
        return [];
      }
      throw error;
    }
  });

  ipcBridge.conversation.stop.provider(async ({ conversation_id }) => {
    if (!canAccessConversation(conversation_id)) {
      return { success: false, msg: 'conversation not found' };
    }
    const task = WorkerManage.getTaskById(conversation_id);
    if (!task) return { success: true, msg: 'conversation not found' };
    if (task.type !== 'acp' && task.type !== 'codex' && task.type !== 'openclaw-gateway' && task.type !== 'nanobot') {
      return { success: false, msg: 'not support' };
    }
    await task.stop();
    return { success: true };
  });

  // 閫氱敤 sendMessage 瀹炵幇 - 鑷姩鏍规嵁 conversation 绫诲瀷鍒嗗彂
  ipcBridge.conversation.sendMessage.provider(async ({ conversation_id, files, ...other }) => {
    console.log(`[conversationBridge] sendMessage called: conversation_id=${conversation_id}, msg_id=${other.msg_id}`);
    if (!canAccessConversation(conversation_id)) {
      return { success: false, msg: 'conversation not found' };
    }

    let task: AcpAgentManager | CodexAgentManager | OpenClawAgentManager | NanoBotAgentManager | undefined;
    try {
      task = (await WorkerManage.getTaskByIdRollbackBuild(conversation_id)) as AcpAgentManager | CodexAgentManager | OpenClawAgentManager | NanoBotAgentManager | undefined;
    } catch (err) {
      console.log(`[conversationBridge] sendMessage: failed to get/build task: ${conversation_id}`, err);
      return { success: false, msg: err instanceof Error ? err.message : 'conversation not found' };
    }

    if (!task) {
      console.log(`[conversationBridge] sendMessage: conversation not found: ${conversation_id}`);
      return { success: false, msg: 'conversation not found' };
    }
    console.log(`[conversationBridge] sendMessage: found task type=${task.type}, status=${task.status}`);

    // 澶嶅埗鏂囦欢鍒板伐浣滅┖闂达紙鎵€鏈?agents 缁熶竴澶勭悊锛?    // Copy files to workspace (unified for all agents)
    const workspaceFiles = await copyFilesToDirectory(task.workspace, files, false);

    try {
      // 鏍规嵁 task 绫诲瀷璋冪敤瀵瑰簲鐨?sendMessage 鏂规硶
      if (task.type === 'acp') {
        await (task as AcpAgentManager).sendMessage({ content: other.input, files: workspaceFiles, msg_id: other.msg_id });
        return { success: true };
      } else if (task.type === 'codex') {
        await (task as CodexAgentManager).sendMessage({ content: other.input, files: workspaceFiles, msg_id: other.msg_id });
        return { success: true };
      } else if (task.type === 'openclaw-gateway') {
        await (task as OpenClawAgentManager).sendMessage({ content: other.input, files: workspaceFiles, msg_id: other.msg_id });
        return { success: true };
      } else if (task.type === 'nanobot') {
        await (task as NanoBotAgentManager).sendMessage({ content: other.input, files: workspaceFiles, msg_id: other.msg_id });
        return { success: true };
      } else {
        return { success: false, msg: `Unsupported task type: ${task.type}` };
      }
    } catch (err: unknown) {
      return { success: false, msg: err instanceof Error ? err.message : String(err) };
    }
  });

  // 閫氱敤 confirmMessage 瀹炵幇 - 鑷姩鏍规嵁 conversation 绫诲瀷鍒嗗彂

  ipcBridge.conversation.confirmation.confirm.provider(async ({ conversation_id, msg_id, data, callId }) => {
    if (!canAccessConversation(conversation_id)) return { success: false, msg: 'conversation not found' };
    const task = WorkerManage.getTaskById(conversation_id);
    if (!task) return { success: false, msg: 'conversation not found' };
    task.confirm(msg_id, callId, data);
    return { success: true };
  });
  ipcBridge.conversation.confirmation.list.provider(async ({ conversation_id }) => {
    if (!canAccessConversation(conversation_id)) return [];
    const task = WorkerManage.getTaskById(conversation_id);
    if (!task) return [];
    return task.getConfirmations();
  });

  // Session-level approval memory for "always allow" decisions
  // 浼氳瘽绾у埆鐨勬潈闄愯蹇嗭紝鐢ㄤ簬 "always allow" 鍐崇瓥
  // Keys are parsed from raw action+commandType here (single source of truth)
  // Keys 鍦ㄦ澶勪粠鍘熷 action+commandType 瑙ｆ瀽锛堝崟涓€鏁版嵁婧愶級
  ipcBridge.conversation.approval.check.provider(async ({ conversation_id: _conversation_id, action: _action, commandType: _commandType }) => {
    return false;
  });
}
