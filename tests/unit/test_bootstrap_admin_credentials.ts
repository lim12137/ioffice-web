/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { resolveBootstrapAdminCredentials } from '@/webserver/config/bootstrapCredentials';
import { describe, it, expect } from '@jest/globals';

describe('resolveBootstrapAdminCredentials', () => {
  it('uses CLI credentials when both are provided with equals syntax', () => {
    const result = resolveBootstrapAdminCredentials({
      argv: ['node', 'app.js', '--admin-user=owner', '--admin-pass=Secret123!'],
      env: {},
    });

    expect(result).toEqual({
      username: 'owner',
      password: 'Secret123!',
      source: 'cli',
    });
  });

  it('uses CLI credentials when both are provided with split syntax', () => {
    const result = resolveBootstrapAdminCredentials({
      argv: ['node', 'app.js', '--admin-user', 'alice', '--admin-pass', 'Passw0rd!'],
      env: {},
    });

    expect(result).toEqual({
      username: 'alice',
      password: 'Passw0rd!',
      source: 'cli',
    });
  });

  it('falls back to env credentials when CLI is absent', () => {
    const result = resolveBootstrapAdminCredentials({
      argv: ['node', 'app.js', '--webui'],
      env: {
        AIONUI_ADMIN_USERNAME: 'env-admin',
        AIONUI_ADMIN_PASSWORD: 'EnvPass!234',
      },
    });

    expect(result).toEqual({
      username: 'env-admin',
      password: 'EnvPass!234',
      source: 'env',
    });
  });

  it('ignores partial CLI credentials and uses env credentials', () => {
    const result = resolveBootstrapAdminCredentials({
      argv: ['node', 'app.js', '--admin-user', 'only-user'],
      env: {
        AIONUI_ADMIN_USERNAME: 'env-admin',
        AIONUI_ADMIN_PASSWORD: 'EnvPass!234',
      },
    });

    expect(result).toEqual({
      username: 'env-admin',
      password: 'EnvPass!234',
      source: 'env',
    });
  });

  it('falls back to deterministic defaults when no valid preset exists', () => {
    const result = resolveBootstrapAdminCredentials({
      argv: ['node', 'app.js'],
      env: {},
    });

    expect(result).toEqual({
      username: 'admin',
      password: 'admin123456',
      source: 'default',
    });
  });
});
