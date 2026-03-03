/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '../../common';
import { getDatabase } from '@process/database';
import { ProcessChat } from '../initStorage';
import type { TChatConversation } from '@/common/storage';
import { getBridgeRequestUserId } from './bridgeRequestContext';
import { migrateConversationToDatabase } from './migrationUtils';

export function initDatabaseBridge(): void {
  // Get conversation messages from database
  ipcBridge.database.getConversationMessages.provider(({ conversation_id, page = 0, pageSize = 10000 }) => {
    try {
      const db = getDatabase();
      const userId = getBridgeRequestUserId();
      const result = db.getConversationMessages(conversation_id, page, pageSize, 'ASC', userId);
      return Promise.resolve(result.data || []);
    } catch (error) {
      console.error('[DatabaseBridge] Error getting conversation messages:', error);
      return Promise.resolve([]);
    }
  });

  // Get user conversations from database with lazy migration from file storage
  ipcBridge.database.getUserConversations.provider(async ({ page = 0, pageSize = 10000 }) => {
    try {
      const db = getDatabase();
      const userId = getBridgeRequestUserId();
      const result = db.getUserConversations(userId, page, pageSize);
      const dbConversations = result.data || [];

      // In authenticated WebUI mode, database is the single source of truth.
      if (userId) {
        return dbConversations;
      }

      // Try to get conversations from file storage
      let fileConversations: TChatConversation[] = [];
      try {
        fileConversations = (await ProcessChat.get('chat.history')) || [];
      } catch (error) {
        console.warn('[DatabaseBridge] No file-based conversations found:', error);
      }

      // Use database conversations as the primary source while backfilling missing ones from file storage
      // 浠ユ暟鎹簱缁撴灉涓轰富锛屽彧琛ュ厖鏂囦欢涓皻鏈縼绉荤殑浼氳瘽锛岄伩鍏嶅垹闄ゅ悗鍑虹幇鈥滃彧鍓╂洿鏃╄褰曗€濈殑闂
      // Build a map for fast lookup to avoid duplicates when merging
      const dbConversationMap = new Map(dbConversations.map((conv) => [conv.id, conv] as const));

      // Filter out conversations that already exist in database
      // Keep only file conversations that are not yet in the database
      const fileOnlyConversations = fileConversations.filter((conv) => !dbConversationMap.has(conv.id));

      // If there are conversations that only exist in file storage, migrate them in background
      // Migrate file-only conversations in the background
      if (fileOnlyConversations.length > 0) {
        void Promise.all(fileOnlyConversations.map((conv) => migrateConversationToDatabase(conv)));
      }

      // Combine database conversations (source of truth) with any remaining file-only conversations
      // 杩斿洖鏁版嵁搴撶粨鏋?+ 鏈縼绉讳細璇濓紝杩欐牱"浠婂ぉ"涓?鏇存棭"璁板綍閮借兘绋冲畾灞曠ず
      const allConversations = [...dbConversations, ...fileOnlyConversations];
      // Re-sort by modifyTime (or createTime as fallback) to maintain correct order
      allConversations.sort((a, b) => (b.modifyTime || b.createTime || 0) - (a.modifyTime || a.createTime || 0));
      return allConversations;
    } catch (error) {
      console.error('[DatabaseBridge] Error getting user conversations:', error);
      return [];
    }
  });
}
