/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from '@jest/globals';
import { EMPTY_DIRECTORY_DATA, normalizeDirectoryData } from '@/renderer/components/directorySelectionData';

describe('normalizeDirectoryData', () => {
  it('returns sanitized items for a valid payload', () => {
    const result = normalizeDirectoryData({
      items: [
        { name: 'src', path: '/workspace/src', isDirectory: true },
        { name: 'README.md', path: '/workspace/README.md', isDirectory: false, isFile: true },
      ],
      canGoUp: true,
      parentPath: '/workspace',
    });

    expect(result).toEqual({
      items: [
        { name: 'src', path: '/workspace/src', isDirectory: true, isFile: false },
        { name: 'README.md', path: '/workspace/README.md', isDirectory: false, isFile: true },
      ],
      canGoUp: true,
      parentPath: '/workspace',
    });
  });

  it('falls back to empty data for API error payload', () => {
    const result = normalizeDirectoryData({ error: 'Directory not found' });
    expect(result).toEqual(EMPTY_DIRECTORY_DATA);
  });

  it('filters malformed entries in items array', () => {
    const result = normalizeDirectoryData({
      items: [null, { name: 'missing-path', isDirectory: true }, { path: '/workspace/missing-name', isDirectory: false, isFile: true }, { name: 'ok', path: '/workspace/ok', isDirectory: true }],
      canGoUp: false,
    });

    expect(result).toEqual({
      items: [{ name: 'ok', path: '/workspace/ok', isDirectory: true, isFile: false }],
      canGoUp: false,
      parentPath: undefined,
    });
  });

  it('returns empty data for non-object payloads', () => {
    expect(normalizeDirectoryData(undefined)).toEqual(EMPTY_DIRECTORY_DATA);
    expect(normalizeDirectoryData('not-an-object')).toEqual(EMPTY_DIRECTORY_DATA);
  });
});
