/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TProviderWithModel } from '@/common/storage';
import { ProcessConfig } from '@/process/initStorage';
import type { IRegisteredAction } from './types';
import { SystemActionNames, createErrorResponse } from './types';

/**
 * Get the default model for Channel assistant
 * Third-party channel plugins have been removed.
 */

export async function getChannelDefaultModel(_platform: string): Promise<TProviderWithModel> {
  try {
    // Try to get saved model selection
    const savedModel = await ProcessConfig.get('model.config');
    if (savedModel && Array.isArray(savedModel) && savedModel.length > 0) {
      const provider = savedModel[0];
      if (provider?.model?.length > 0) {
        return {
          ...provider,
          useModel: provider.model[0],
        } as TProviderWithModel;
      }
    }
  } catch (error) {
    console.warn('[SystemActions] Failed to get saved model, using default:', error);
  }

  // Default fallback
  return {
    id: 'openai_default',
    platform: 'custom',
    name: 'OpenAI Compatible',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    useModel: 'gpt-4o-mini',
  };
}

/**
 * SystemActions - Handlers for system-level actions
 *
 * Third-party channel plugins have been removed.
 * These actions are stubs for compatibility.
 */

/**
 * Handle session.new - Create a new conversation session
 */
export const handleSessionNew = async () => {
  return createErrorResponse('Channel plugins are not available');
};

/**
 * Handle session.status - Show current session status
 */
export const handleSessionStatus = async () => {
  return createErrorResponse('Channel plugins are not available');
};

/**
 * Handle help.show - Show help menu
 */
export const handleHelpShow = async () => {
  return createErrorResponse('Channel plugins are not available');
};

/**
 * Handle help.features - Show feature introduction
 */
export const handleHelpFeatures = async () => {
  return createErrorResponse('Channel plugins are not available');
};

/**
 * Handle help.pairing - Show pairing guide
 */
export const handleHelpPairing = async () => {
  return createErrorResponse('Channel plugins are not available');
};

/**
 * Handle help.tips - Show usage tips
 */
export const handleHelpTips = async () => {
  return createErrorResponse('Channel plugins are not available');
};

/**
 * Handle settings.show - Show settings info
 */
export const handleSettingsShow = async () => {
  return createErrorResponse('Channel plugins are not available');
};

/**
 * Handle agent.show - Show agent selection
 */
export const handleAgentShow = async () => {
  return createErrorResponse('Channel plugins are not available');
};

/**
 * Handle agent.select - Switch to a different agent
 */
export const handleAgentSelect = async () => {
  return createErrorResponse('Channel plugins are not available');
};

/**
 * All system actions
 */
export const systemActions: IRegisteredAction[] = [
  {
    name: SystemActionNames.SESSION_NEW,
    category: 'system',
    description: 'Create a new conversation session',
    handler: handleSessionNew,
  },
  {
    name: SystemActionNames.SESSION_STATUS,
    category: 'system',
    description: 'Show current session status',
    handler: handleSessionStatus,
  },
  {
    name: SystemActionNames.HELP_SHOW,
    category: 'system',
    description: 'Show help menu',
    handler: handleHelpShow,
  },
  {
    name: SystemActionNames.HELP_FEATURES,
    category: 'system',
    description: 'Show feature introduction',
    handler: handleHelpFeatures,
  },
  {
    name: SystemActionNames.HELP_PAIRING,
    category: 'system',
    description: 'Show pairing guide',
    handler: handleHelpPairing,
  },
  {
    name: SystemActionNames.HELP_TIPS,
    category: 'system',
    description: 'Show usage tips',
    handler: handleHelpTips,
  },
  {
    name: SystemActionNames.SETTINGS_SHOW,
    category: 'system',
    description: 'Show settings info',
    handler: handleSettingsShow,
  },
  {
    name: SystemActionNames.AGENT_SHOW,
    category: 'system',
    description: 'Show agent selection',
    handler: handleAgentShow,
  },
  {
    name: SystemActionNames.AGENT_SELECT,
    category: 'system',
    description: 'Switch to a different agent',
    handler: handleAgentSelect,
  },
];
