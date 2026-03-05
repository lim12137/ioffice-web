/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConversationProvider } from '@/renderer/context/ConversationContext';
import MessageList from '@renderer/messages/MessageList';
import { MessageListProvider, useMessageLstCache } from '@renderer/messages/hooks';
import HOC from '@renderer/utils/HOC';
import React, { useEffect } from 'react';
import LocalImageView from '../../../components/LocalImageView';
import ConversationChatConfirm from '../components/ConversationChatConfirm';
import OpenClawSendBox from './OpenClawSendBox';

const OpenClawChat: React.FC<{
  conversation_id: string;
  workspace: string;
}> = ({ conversation_id, workspace }) => {
  useMessageLstCache(conversation_id);
  const updateLocalImage = LocalImageView.useUpdateLocalImage();
  useEffect(() => {
    updateLocalImage({ root: workspace });
  }, [workspace]);
  return (
    <ConversationProvider value={{ conversationId: conversation_id, workspace, type: 'openclaw-gateway' }}>
      <div className='chat-main-panel flex-1 flex flex-col w-full min-w-0 overflow-hidden h-full'>
        {/* 聊天记录区域 - 单一滚动层 */}
        <div className='chat-messages-shell flex-1 min-h-0 px-16px sm:px-20px pt-10px'>
          <div className='chat-content-shell h-full'>
            <MessageList className='h-full' />
          </div>
        </div>
        {/* 聊天框区域 - 固定底部 */}
        <div className='chat-input-shell flex-shrink-0 w-full pb-12px sm:pb-16px'>
          <ConversationChatConfirm conversation_id={conversation_id}>
            <OpenClawSendBox conversation_id={conversation_id} />
          </ConversationChatConfirm>
        </div>
      </div>
    </ConversationProvider>
  );
};

export default HOC(MessageListProvider)(OpenClawChat);
