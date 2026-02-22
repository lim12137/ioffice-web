/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import AionScrollArea from '@/renderer/components/base/AionScrollArea';
import { useAuth } from '@/renderer/context/AuthContext';
import { Button, Message } from '@arco-design/web-react';
import classNames from 'classnames';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSettingsViewMode } from '../settingsViewContext';

interface AccountModalContentProps {
  onRequestClose?: () => void;
}

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className='flex items-center justify-between py-12px'>
    <span className='text-14px text-t-secondary'>{label}</span>
    <span className='text-14px text-t-primary'>{value}</span>
  </div>
);

const AccountModalContent: React.FC<AccountModalContentProps> = ({ onRequestClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, status, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, messageContext] = Message.useMessage();
  const viewMode = useSettingsViewMode();
  const isPageMode = viewMode === 'page';
  const isDesktopRuntime = typeof window !== 'undefined' && Boolean(window.electronAPI);

  const handleLogout = async () => {
    if (isDesktopRuntime) {
      message.info(t('settings.accountDesktopNoLogout', { defaultValue: 'Desktop mode does not require login/logout.' }));
      return;
    }

    setLoggingOut(true);
    try {
      await logout();
      onRequestClose?.();
      void navigate('/login', { replace: true });
    } catch (error) {
      console.error('Failed to logout:', error);
      message.error(t('settings.accountLogoutFailed', { defaultValue: 'Failed to logout' }));
    } finally {
      setLoggingOut(false);
    }
  };

  const username = user?.username || t('settings.accountUnknown', { defaultValue: 'Unknown' });
  const statusLabel = status === 'authenticated' ? t('settings.accountAuthenticated', { defaultValue: 'Authenticated' }) : t('settings.accountUnauthenticated', { defaultValue: 'Unauthenticated' });

  return (
    <div className='flex flex-col h-full w-full'>
      {messageContext}
      <AionScrollArea className='flex-1 min-h-0 pb-16px' disableOverflow={isPageMode}>
        <div className='space-y-16px'>
          <div className='px-[12px] md:px-[32px] py-16px bg-2 rd-16px'>
            <div className='text-14px font-500 mb-8px text-t-primary'>{t('settings.account', { defaultValue: 'Account' })}</div>
            <InfoRow label={t('login.username')} value={username} />
            <InfoRow label={t('settings.authMethod')} value={statusLabel} />
          </div>
        </div>
      </AionScrollArea>

      <div className={classNames('flex-shrink-0 flex gap-10px border-t border-border-2 pl-24px py-16px', isPageMode ? 'border-none pl-0 pr-0 pt-10px flex-col md:flex-row md:justify-end' : 'justify-end')}>
        <Button type='primary' status='danger' loading={loggingOut} disabled={isDesktopRuntime} onClick={handleLogout} className={classNames('rd-100px', isPageMode && 'w-full md:w-auto')}>
          {t('settings.googleLogout')}
        </Button>
      </div>
    </div>
  );
};

export default AccountModalContent;
