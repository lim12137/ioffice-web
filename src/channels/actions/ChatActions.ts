/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IRegisteredAction, ActionHandler } from './types';
import { ChatActionNames, createErrorResponse } from './types';
import { getChannelMessageService } from '../agent/ChannelMessageService';

/**
 * ChatActions - Handlers for chat/AI-related actions
 *
 * Third-party channel plugins have been removed.
 * These actions are stubs for compatibility.
 */

/**
 * Handle chat.send - Send a message to AI and get response
 */
export const handleChatSend: ActionHandler = async (_context) => {
  return createErrorResponse('Channel plugins are not available');
};

/**
 * Handle chat.regenerate - Regenerate the last AI response
 */
export const handleChatRegenerate: ActionHandler = async (_context, _params) => {
  return createErrorResponse('Channel plugins are not available');
};

/**
 * Handle chat.continue - Continue the AI response
 */
export const handleChatContinue: ActionHandler = async (_context, _params) => {
  return createErrorResponse('Channel plugins are not available');
};

/**
 * Handle action.copy - Copy response content
 */
export const handleCopy: ActionHandler = async (_context, _params) => {
  return createErrorResponse('Channel plugins are not available');
};

/**
 * Handle tool confirmation
 */
export const handleToolConfirm: ActionHandler = async (context, params) => {
  const callId = params?.callId;
  const value = params?.value;
  const conversationId = context.conversationId;

  if (!callId || !value || !conversationId) {
    return createErrorResponse('Missing confirmation parameters');
  }

  try {
    await getChannelMessageService().confirm(conversationId, callId, value);
    return { success: true };
  } catch (error: any) {
    console.error('[ChatActions] Tool confirmation failed:', error);
    return createErrorResponse(`Confirmation failed: ${error.message}`);
  }
};

/**
 * All chat actions
 */
export const chatActions: IRegisteredAction[] = [
  {
    name: ChatActionNames.SEND,
    category: 'chat',
    description: 'Send a message to AI',
    handler: handleChatSend,
  },
  {
    name: ChatActionNames.REGENERATE,
    category: 'chat',
    description: 'Regenerate the last AI response',
    handler: handleChatRegenerate,
  },
  {
    name: ChatActionNames.CONTINUE,
    category: 'chat',
    description: 'Continue the AI response',
    handler: handleChatContinue,
  },
  {
    name: ChatActionNames.COPY,
    category: 'chat',
    description: 'Copy response content',
    handler: handleCopy,
  },
  {
    name: ChatActionNames.TOOL_CONFIRM,
    category: 'chat',
    description: 'Confirm tool execution',
    handler: handleToolConfirm,
  },
];

/**
 * Build a chat response with action buttons
 */
export function buildChatResponse(
  text: string,
  _isComplete: boolean = true
): {
  text: string;
  parseMode: 'HTML' | 'MarkdownV2' | 'Markdown';
  replyMarkup?: unknown;
} {
  return {
    text,
    parseMode: 'HTML',
    replyMarkup: undefined,
  };
}

/**
 * Build an error response for chat failures
 */
export function buildChatErrorResponse(error: string): {
  text: string;
  parseMode: 'HTML' | 'MarkdownV2' | 'Markdown';
  replyMarkup?: unknown;
} {
  return {
    text: `❌ <b>Processing Failed</b>\n\n${error}`,
    parseMode: 'HTML',
    replyMarkup: undefined,
  };
}

/**
 * Build a streaming indicator
 */
export function buildStreamingIndicator(partialText: string): {
  text: string;
  parseMode: 'HTML' | 'MarkdownV2' | 'Markdown';
} {
  return {
    text: partialText + ' ⏳',
    parseMode: 'HTML',
  };
}
