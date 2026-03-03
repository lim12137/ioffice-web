/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile?: boolean;
}

export interface DirectoryData {
  items: DirectoryItem[];
  canGoUp: boolean;
  parentPath?: string;
}

export const EMPTY_DIRECTORY_DATA: DirectoryData = {
  items: [],
  canGoUp: false,
};

const toDirectoryItem = (value: unknown): DirectoryItem | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name : '';
  const path = typeof record.path === 'string' ? record.path : '';

  if (!name || !path) {
    return null;
  }

  return {
    name,
    path,
    isDirectory: record.isDirectory === true,
    isFile: record.isFile === true,
  };
};

export const normalizeDirectoryData = (value: unknown): DirectoryData => {
  if (!value || typeof value !== 'object') {
    return EMPTY_DIRECTORY_DATA;
  }

  const record = value as Record<string, unknown>;
  const rawItems = Array.isArray(record.items) ? record.items : [];

  return {
    items: rawItems.map(toDirectoryItem).filter((item): item is DirectoryItem => item !== null),
    canGoUp: record.canGoUp === true,
    parentPath: typeof record.parentPath === 'string' ? record.parentPath : undefined,
  };
};
