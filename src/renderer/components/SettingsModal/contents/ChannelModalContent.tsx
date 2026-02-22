/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import AionScrollArea from '@/renderer/components/base/AionScrollArea';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsViewMode } from '../settingsViewContext';

/**
 * Channel Settings Content Component
 *
 * Third-party channel plugins have been removed.
 */
const ChannelModalContent: React.FC = () => {
  const { t } = useTranslation();
  const viewMode = useSettingsViewMode();
  const isPageMode = viewMode === 'page';

  return (
    <AionScrollArea className={isPageMode ? 'h-full' : ''}>
      <div className='flex flex-col gap-12px p-16px'>
        <div className='text-14px text-t-secondary py-12px'>{t('channels.pluginsRemoved', 'External channel plugins (Telegram, Lark, DingTalk) are removed. This build focuses on local skills workflows and Claude Code/Codex capabilities.')}</div>
      </div>
    </AionScrollArea>
  );
};

export default ChannelModalContent;
