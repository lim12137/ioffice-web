/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getChannelConversationName, isChannelPlatform } from '@/channels/types';
import type { ICreateConversationParams } from '@/common/ipcBridge';
import type { ConversationSource, TChatConversation } from '@/common/storage';
import { getDatabase } from '@process/database';
import { createAcpAgent, createCodexAgent, createNanobotAgent, createOpenClawAgent } from '../initAgent';
import WorkerManage from '../WorkerManage';

/**
 * Common parameters for creating conversation (extends IPC params)
 */
export interface ICreateConversationOptions extends ICreateConversationParams {
  source?: ConversationSource;
  channelChatId?: string;
  userId?: string;
}

/**
 * Result of creating a conversation
 */
export interface ICreateConversationResult {
  success: boolean;
  conversation?: TChatConversation;
  error?: string;
}

/**
 * Common conversation creation service
 */
export class ConversationService {
  /**
   * Legacy compatibility API.
   * Gemini support has been removed from the project.
   */
  static async createGeminiConversation(): Promise<ICreateConversationResult> {
    return { success: false, error: 'Gemini conversations are no longer supported' };
  }

  /**
   * Create conversation (supports non-Gemini types)
   */
  static async createConversation(params: ICreateConversationOptions): Promise<ICreateConversationResult> {
    const { type, name, id, source } = params;

    try {
      let conversation: TChatConversation;

      if (type === 'gemini') {
        return { success: false, error: 'Gemini conversations are no longer supported' };
      }

      if (type === 'acp') {
        conversation = await createAcpAgent(params);
      } else if (type === 'codex') {
        conversation = await createCodexAgent(params);
      } else if (type === 'openclaw-gateway') {
        conversation = await createOpenClawAgent(params);
      } else if (type === 'nanobot') {
        conversation = await createNanobotAgent(params);
      } else {
        return { success: false, error: 'Invalid conversation type' };
      }

      if (name) {
        conversation.name = name;
      }
      if (id) {
        conversation.id = id;
      }
      if (source) {
        conversation.source = source;
      }
      if (params.channelChatId) {
        conversation.channelChatId = params.channelChatId;
      }

      const db = getDatabase();
      const result = db.createConversation(conversation, params.userId);
      if (!result.success) {
        console.error('[ConversationService] Failed to create conversation in database:', result.error);
        return { success: false, error: result.error };
      }

      WorkerManage.buildConversation(conversation);

      console.log(`[ConversationService] Created ${type} conversation ${conversation.id} with source=${source || 'aionui'}`);
      return { success: true, conversation };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('[ConversationService] Failed to create conversation:', error);
      console.error('[ConversationService] Error details:', {
        type: params.type,
        hasModel: !!params.model,
        hasWorkspace: !!params.extra?.workspace,
        error: errorMessage,
        stack: errorStack,
      });
      return { success: false, error: `Failed to create ${params.type} conversation: ${errorMessage}` };
    }
  }

  /**
   * Get or create a conversation for the specified channel
   */
  static async getOrCreateChannelConversation(params: ICreateConversationOptions & { source: ConversationSource }): Promise<ICreateConversationResult> {
    const db = getDatabase();
    const source = params.source;

    if (params.type === 'gemini') {
      return { success: false, error: 'Gemini conversations are no longer supported' };
    }

    if (params.channelChatId) {
      const latestConv = db.findChannelConversation(source, params.channelChatId, params.type, undefined, params.userId);
      if (latestConv.success && latestConv.data) {
        console.log(`[ConversationService] Reusing existing ${source} conversation for chatId=${params.channelChatId}: ${latestConv.data.id}`);
        return { success: true, conversation: latestConv.data };
      }
    }

    return this.createConversation({
      ...params,
      source,
      name: params.name || (isChannelPlatform(source) ? getChannelConversationName(source, params.type, params.extra?.backend, params.channelChatId) : `${source} Assistant`),
    });
  }
}

// Export convenience functions
export const createGeminiConversation = ConversationService.createGeminiConversation.bind(ConversationService);
export const createConversation = ConversationService.createConversation.bind(ConversationService);
export const getOrCreateChannelConversation = ConversationService.getOrCreateChannelConversation.bind(ConversationService);
