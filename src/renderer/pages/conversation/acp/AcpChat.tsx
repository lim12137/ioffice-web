/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConversationProvider } from '@/renderer/context/ConversationContext';
import type { AcpBackend } from '@/types/acpTypes';
import MessageList from '@renderer/messages/MessageList';
import { MessageListProvider, useMessageLstCache } from '@renderer/messages/hooks';
import HOC from '@renderer/utils/HOC';
import React from 'react';
import ConversationChatConfirm from '../components/ConversationChatConfirm';
import AcpSendBox from './AcpSendBox';

const AcpChat: React.FC<{
  conversation_id: string;
  workspace?: string;
  backend: AcpBackend;
}> = ({ conversation_id, workspace, backend }) => {
  useMessageLstCache(conversation_id);

  return (
    <ConversationProvider value={{ conversationId: conversation_id, workspace, type: 'acp' }}>
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
            <AcpSendBox conversation_id={conversation_id} backend={backend}></AcpSendBox>
          </ConversationChatConfirm>
        </div>
      </div>
    </ConversationProvider>
  );
};

export default HOC(MessageListProvider)(AcpChat);
