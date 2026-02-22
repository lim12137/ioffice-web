/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import AccountModalContent from '@/renderer/components/SettingsModal/contents/AccountModalContent';
import SettingsPageWrapper from './components/SettingsPageWrapper';

const AccountSettings: React.FC = () => {
  return (
    <SettingsPageWrapper>
      <AccountModalContent />
    </SettingsPageWrapper>
  );
};

export default AccountSettings;
