/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BootstrapCredentialsInput {
  argv?: string[];
  env?: NodeJS.ProcessEnv;
}

export interface BootstrapAdminCredentials {
  username: string;
  password: string;
  source: 'cli' | 'env' | 'default';
}

const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin123456';

function normalizeValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getSwitchValue(flag: string, argv: string[]): string | undefined {
  const withEqualsPrefix = `--${flag}=`;
  const equalsArg = argv.find((arg) => arg.startsWith(withEqualsPrefix));
  if (equalsArg) {
    return equalsArg.slice(withEqualsPrefix.length);
  }

  const flagIndex = argv.indexOf(`--${flag}`);
  if (flagIndex !== -1) {
    const nextArg = argv[flagIndex + 1];
    if (nextArg && !nextArg.startsWith('--')) {
      return nextArg;
    }
  }

  return undefined;
}

export function resolveBootstrapAdminCredentials(input: BootstrapCredentialsInput = {}): BootstrapAdminCredentials {
  const argv = input.argv ?? process.argv;
  const env = input.env ?? process.env;

  const cliUsername = normalizeValue(getSwitchValue('admin-user', argv));
  const cliPassword = normalizeValue(getSwitchValue('admin-pass', argv));
  if (cliUsername && cliPassword) {
    return {
      username: cliUsername,
      password: cliPassword,
      source: 'cli',
    };
  }

  const envUsername = normalizeValue(env.AIONUI_ADMIN_USERNAME);
  const envPassword = normalizeValue(env.AIONUI_ADMIN_PASSWORD);
  if (envUsername && envPassword) {
    return {
      username: envUsername,
      password: envPassword,
      source: 'env',
    };
  }

  return {
    username: DEFAULT_ADMIN_USERNAME,
    password: DEFAULT_ADMIN_PASSWORD,
    source: 'default',
  };
}
