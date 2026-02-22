/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import './utils/configureChromium';
import fs from 'fs';
import path from 'path';
import { app } from '@/platform/electron';
import { initializeProcess } from './process';
import { initializeAcpDetector } from './process/bridge';
import { loadShellEnvironmentAsync } from './process/utils/shellEnv';
import WorkerManage from './process/WorkerManage';
import { startWebServer } from './webserver';
import { SERVER_CONFIG } from './webserver/config/constants';

const hasSwitch = (flag: string) => process.argv.includes(`--${flag}`);
const hasCommand = (cmd: string) => process.argv.includes(cmd);

const getSwitchValue = (flag: string): string | undefined => {
  const withEqualsPrefix = `--${flag}=`;
  const equalsArg = process.argv.find((arg) => arg.startsWith(withEqualsPrefix));
  if (equalsArg) {
    return equalsArg.slice(withEqualsPrefix.length);
  }

  const argIndex = process.argv.indexOf(`--${flag}`);
  if (argIndex !== -1) {
    const nextArg = process.argv[argIndex + 1];
    if (nextArg && !nextArg.startsWith('--')) {
      return nextArg;
    }
  }

  return undefined;
};

const WEBUI_CONFIG_FILE = 'webui.config.json';

type WebUIUserConfig = {
  port?: number | string;
  allowRemote?: boolean;
  adminUsername?: string;
  adminPassword?: string;
};

const parsePortValue = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const portNumber = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(portNumber) || portNumber < 1 || portNumber > 65535) {
    return null;
  }
  return portNumber;
};

const loadUserWebUIConfig = (): { config: WebUIUserConfig; path: string | null; exists: boolean } => {
  try {
    const userDataPath = app.getPath('userData');
    const configPath = path.join(userDataPath, WEBUI_CONFIG_FILE);
    if (!fs.existsSync(configPath)) {
      return { config: {}, path: configPath, exists: false };
    }

    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as WebUIUserConfig;
    if (!parsed || typeof parsed !== 'object') {
      return { config: {}, path: configPath, exists: false };
    }
    return { config: parsed, path: configPath, exists: true };
  } catch {
    return { config: {}, path: null, exists: false };
  }
};

const resolveWebUIPort = (config: WebUIUserConfig): number => {
  const cliPort = parsePortValue(getSwitchValue('port') ?? getSwitchValue('webui-port'));
  if (cliPort) return cliPort;

  const envPort = parsePortValue(process.env.AIONUI_PORT ?? process.env.PORT);
  if (envPort) return envPort;

  const configPort = parsePortValue(config.port);
  if (configPort) return configPort;

  return SERVER_CONFIG.DEFAULT_PORT;
};

const parseBooleanEnv = (value?: string): boolean | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return null;
};

const normalizeConfigString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const applyBootstrapAdminConfig = (config: WebUIUserConfig): void => {
  const cliUsername = getSwitchValue('admin-user');
  const cliPassword = getSwitchValue('admin-pass');
  if (cliUsername || cliPassword) return;

  if (process.env.AIONUI_ADMIN_USERNAME || process.env.AIONUI_ADMIN_PASSWORD) return;

  const configUsername = normalizeConfigString(config.adminUsername);
  const configPassword = normalizeConfigString(config.adminPassword);
  if (!configUsername || !configPassword) return;

  process.env.AIONUI_ADMIN_USERNAME = configUsername;
  process.env.AIONUI_ADMIN_PASSWORD = configPassword;
};

const isRemoteMode = hasSwitch('remote');

const resolveRemoteAccess = (config: WebUIUserConfig): boolean => {
  const envRemote = parseBooleanEnv(process.env.AIONUI_ALLOW_REMOTE || process.env.AIONUI_REMOTE);
  const hostHint = process.env.AIONUI_HOST?.trim();
  const hostRequestsRemote = hostHint ? ['0.0.0.0', '::', '::0'].includes(hostHint) : false;
  const configRemote = config.allowRemote === true;

  return isRemoteMode || hostRequestsRemote || envRemote === true || configRemote;
};

const isResetPasswordMode = hasCommand('--resetpass');

const shutdown = async (exitCode = 0) => {
  WorkerManage.clear();

  try {
    const { getChannelManager } = await import('@/channels');
    await getChannelManager().shutdown();
  } catch (error) {
    console.error('[WebOnly] Failed to shutdown ChannelManager:', error);
  }

  process.exit(exitCode);
};

const start = async (): Promise<void> => {
  await app.whenReady();

  try {
    await initializeProcess();
  } catch (error) {
    console.error('Failed to initialize process:', error);
    await shutdown(1);
    return;
  }

  if (isResetPasswordMode) {
    try {
      const resetPasswordIndex = process.argv.indexOf('--resetpass');
      const argsAfterCommand = process.argv.slice(resetPasswordIndex + 1);
      const username = argsAfterCommand.find((arg) => !arg.startsWith('--')) || 'admin';
      const { resetPasswordCLI } = await import('./utils/resetPasswordCLI');
      await resetPasswordCLI(username);
      await shutdown(0);
      return;
    } catch {
      await shutdown(1);
      return;
    }
  }

  const userConfigInfo = loadUserWebUIConfig();
  applyBootstrapAdminConfig(userConfigInfo.config);
  const resolvedPort = resolveWebUIPort(userConfigInfo.config);
  const allowRemote = resolveRemoteAccess(userConfigInfo.config);

  await startWebServer(resolvedPort, allowRemote);

  await initializeAcpDetector();
  void loadShellEnvironmentAsync();

  process.on('SIGINT', () => {
    void shutdown(0);
  });

  process.on('SIGTERM', () => {
    void shutdown(0);
  });
};

void start().catch((error) => {
  console.error('[WebOnly] Startup failed:', error);
  process.exit(1);
});
