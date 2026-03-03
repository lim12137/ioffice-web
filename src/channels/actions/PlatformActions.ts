/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IRegisteredAction, ActionHandler } from './types';
import { PlatformActionNames, createErrorResponse } from './types';

/**
 * PlatformActions - Handlers for platform-specific actions
 *
 * Third-party channel plugins have been removed.
 * This module provides stub handlers for compatibility.
 */

/**
 * Handle pairing.show - Show pairing code to user
 */
export const handlePairingShow: ActionHandler = async (_context) => {
  return createErrorResponse('Channel plugins are not available');
};

/**
 * Handle pairing.refresh - Refresh pairing code
 */
export const handlePairingRefresh: ActionHandler = async (_context) => {
  return createErrorResponse('Channel plugins are not available');
};

/**
 * Handle pairing.check - Check pairing status
 */
export const handlePairingCheck: ActionHandler = async (_context) => {
  return createErrorResponse('Channel plugins are not available');
};

/**
 * Handle pairing.help - Show pairing help
 */
export const handlePairingHelp: ActionHandler = async (_context) => {
  return createErrorResponse('Channel plugins are not available');
};

/**
 * All platform actions
 */
export const platformActions: IRegisteredAction[] = [
  {
    name: PlatformActionNames.PAIRING_SHOW,
    category: 'platform',
    description: 'Show pairing code',
    handler: handlePairingShow,
  },
  {
    name: PlatformActionNames.PAIRING_REFRESH,
    category: 'platform',
    description: 'Refresh pairing code',
    handler: handlePairingRefresh,
  },
  {
    name: PlatformActionNames.PAIRING_CHECK,
    category: 'platform',
    description: 'Check pairing status',
    handler: handlePairingCheck,
  },
  {
    name: PlatformActionNames.PAIRING_HELP,
    category: 'platform',
    description: 'Show pairing help',
    handler: handlePairingHelp,
  },
];
