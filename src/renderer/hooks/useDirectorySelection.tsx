/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { bridge } from '@office-ai/platform';
import React, { useCallback, useEffect, useState } from 'react';
import { SHOW_OPEN_REQUEST_EVENT } from '../../adapter/constant';
import DirectorySelectionModal from '../components/DirectorySelectionModal';

interface DirectorySelectionRequest {
  id: string;
  isFileMode?: boolean;
  properties?: string[];
  data?: {
    properties?: string[];
  };
}

interface DirectoryCapableInput extends HTMLInputElement {
  webkitdirectory?: boolean;
  directory?: boolean;
}

const extractProperties = (request: DirectorySelectionRequest): string[] => {
  if (Array.isArray(request.properties)) {
    return request.properties;
  }
  if (Array.isArray(request.data?.properties)) {
    return request.data.properties;
  }
  return [];
};

const inferIsFileMode = (request: DirectorySelectionRequest, properties: string[]): boolean => {
  if (request.isFileMode === true) {
    return true;
  }
  return properties.includes('openFile') && !properties.includes('openDirectory');
};

const sanitizeRelativePath = (rawPath: string): string => {
  return rawPath
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part && part !== '.' && part !== '..')
    .join('/');
};

const joinFsPath = (basePath: string, relativePath: string): string => {
  const cleanRelative = sanitizeRelativePath(relativePath);
  if (!cleanRelative) {
    return basePath;
  }

  const useBackslash = basePath.includes('\\');
  const separator = useBackslash ? '\\' : '/';
  const normalizedRelative = useBackslash ? cleanRelative.replace(/\//g, '\\') : cleanRelative;

  if (basePath.endsWith('\\') || basePath.endsWith('/')) {
    return `${basePath}${normalizedRelative}`;
  }
  return `${basePath}${separator}${normalizedRelative}`;
};

const pickLocalFiles = (options: { directory?: boolean; multiple?: boolean }): Promise<File[]> => {
  return new Promise((resolve) => {
    const input = document.createElement('input') as DirectoryCapableInput;
    let settled = false;

    const finish = (files: File[]) => {
      if (settled) {
        return;
      }
      settled = true;
      input.remove();
      resolve(files);
    };

    const handleWindowFocus = () => {
      window.setTimeout(() => {
        finish(Array.from(input.files || []));
      }, 300);
    };

    input.type = 'file';
    input.multiple = options.multiple === true;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.opacity = '0';

    if (options.directory) {
      input.webkitdirectory = true;
      input.directory = true;
    }

    input.addEventListener(
      'change',
      () => {
        finish(Array.from(input.files || []));
      },
      { once: true }
    );
    window.addEventListener('focus', handleWindowFocus, { once: true });

    document.body.appendChild(input);
    input.click();
  });
};

const readFileData = async (file: File): Promise<Uint8Array> => {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
};

export const useDirectorySelection = () => {
  const [visible, setVisible] = useState(false);
  const [requestData, setRequestData] = useState<DirectorySelectionRequest | null>(null);

  const emitBridgeCallback = useCallback((requestId: string | undefined, paths: string[] | undefined) => {
    if (!requestId) {
      return;
    }
    const callbackEventName = `subscribe.callback-show-open${requestId}`;
    if ((window as any).__emitBridgeCallback) {
      (window as any).__emitBridgeCallback(callbackEventName, paths);
    }
  }, []);

  const uploadSelectedFilesToTemp = useCallback(async (multiple: boolean): Promise<string[] | undefined> => {
    const selectedFiles = await pickLocalFiles({ multiple });
    if (!selectedFiles.length) {
      return undefined;
    }

    const filesToUpload = multiple ? selectedFiles : selectedFiles.slice(0, 1);
    const uploadedPaths: string[] = [];

    for (const file of filesToUpload) {
      const tempPath = await ipcBridge.fs.createTempFile.invoke({ fileName: file.name });
      if (!tempPath) {
        continue;
      }
      const fileData = await readFileData(file);
      const success = await ipcBridge.fs.writeFile.invoke({ path: tempPath, data: fileData });
      if (success) {
        uploadedPaths.push(tempPath);
      }
    }

    return uploadedPaths.length > 0 ? uploadedPaths : undefined;
  }, []);

  const uploadSelectedDirectoryToTemp = useCallback(async (multiple: boolean): Promise<string[] | undefined> => {
    const selectedFiles = await pickLocalFiles({ directory: true, multiple });
    if (!selectedFiles.length) {
      return undefined;
    }

    const preparedFiles = selectedFiles.map((file) => {
      const rawRelativePath = ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name).toString();
      const normalizedRelativePath = sanitizeRelativePath(rawRelativePath);
      return {
        file,
        relativePath: normalizedRelativePath || sanitizeRelativePath(file.name),
      };
    });

    const rootSegments = new Set(preparedFiles.map((item) => item.relativePath.split('/')[0]).filter(Boolean));
    const singleRootName = rootSegments.size === 1 ? Array.from(rootSegments)[0] : '';

    const tempDirectoryPath = await ipcBridge.fs.createTempDirectory.invoke({
      directoryName: singleRootName || 'upload-folder',
    });
    if (!tempDirectoryPath) {
      return undefined;
    }

    let uploadedCount = 0;

    for (const item of preparedFiles) {
      let relativePath = item.relativePath;
      if (singleRootName && relativePath.startsWith(`${singleRootName}/`)) {
        relativePath = relativePath.slice(singleRootName.length + 1);
      }
      const finalRelativePath = relativePath || sanitizeRelativePath(item.file.name);
      if (!finalRelativePath) {
        continue;
      }

      const targetPath = joinFsPath(tempDirectoryPath, finalRelativePath);
      const fileData = await readFileData(item.file);
      const success = await ipcBridge.fs.writeFile.invoke({ path: targetPath, data: fileData });
      if (success) {
        uploadedCount += 1;
      }
    }

    return uploadedCount > 0 ? [tempDirectoryPath] : undefined;
  }, []);

  const handleConfirm = useCallback(
    (paths: string[] | undefined) => {
      emitBridgeCallback(requestData?.id, paths);
      setVisible(false);
      setRequestData(null);
    },
    [emitBridgeCallback, requestData]
  );

  const handleCancel = useCallback(() => {
    emitBridgeCallback(requestData?.id, undefined);
    setVisible(false);
    setRequestData(null);
  }, [emitBridgeCallback, requestData]);

  useEffect(() => {
    const handleShowOpenRequest = (incoming: DirectorySelectionRequest) => {
      const properties = extractProperties(incoming);
      const isFileMode = inferIsFileMode(incoming, properties);
      const wantsDirectorySelection = properties.includes('openDirectory');
      const shouldUseLocalPicker = (isFileMode || wantsDirectorySelection) && !properties.includes('createDirectory');
      const request = { ...incoming, properties, isFileMode };

      if (shouldUseLocalPicker) {
        void (async () => {
          try {
            const resultPaths = isFileMode ? await uploadSelectedFilesToTemp(properties.includes('multiSelections')) : await uploadSelectedDirectoryToTemp(properties.includes('multiSelections'));
            emitBridgeCallback(request.id, resultPaths);
          } catch (error) {
            console.error('Failed to handle local file selection:', error);
            emitBridgeCallback(request.id, undefined);
          }
        })();
        return;
      }

      setRequestData(request);
      setVisible(true);
    };

    bridge.on(SHOW_OPEN_REQUEST_EVENT, handleShowOpenRequest);

    return () => {
      bridge.off(SHOW_OPEN_REQUEST_EVENT, handleShowOpenRequest);
    };
  }, [emitBridgeCallback, uploadSelectedDirectoryToTemp, uploadSelectedFilesToTemp]);

  const contextHolder = <DirectorySelectionModal visible={visible} isFileMode={requestData?.isFileMode} onConfirm={handleConfirm} onCancel={handleCancel} />;

  return { contextHolder };
};
