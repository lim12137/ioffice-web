/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SessionManager } from '../core/SessionManager';
import type { PairingService } from '../pairing/PairingService';
import type { PluginMessageHandler } from '../plugins/BasePlugin';
import type { IUnifiedIncomingMessage } from '../types';
import type { PluginManager } from './PluginManager';

/**
 * ActionExecutor - Routes and executes actions from incoming messages
 *
 * Third-party channel plugins have been removed.
 * This class is a stub for compatibility.
 */
export class ActionExecutor {
  constructor(_pluginManager: PluginManager, _sessionManager: SessionManager, _pairingService: PairingService) {}

  /**
   * Get the message handler for plugins
   */
  getMessageHandler(): PluginMessageHandler {
    return this.handleIncomingMessage.bind(this);
  }

  /**
   * Handle incoming message from plugin
   */
  private async handleIncomingMessage(_message: IUnifiedIncomingMessage): Promise<void> {
    // Third-party channel plugins have been removed
    console.warn('[ActionExecutor] Channel plugins are not available');
  }
}
