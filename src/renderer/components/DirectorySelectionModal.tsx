/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button, Modal, Spin } from '@arco-design/web-react';
import { IconFile, IconFolder, IconUp } from '@arco-design/web-react/icon';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EMPTY_DIRECTORY_DATA, type DirectoryData, type DirectoryItem, normalizeDirectoryData } from './directorySelectionData';

interface DirectorySelectionModalProps {
  visible: boolean;
  isFileMode?: boolean;
  onConfirm: (paths: string[] | undefined) => void;
  onCancel: () => void;
}

const DirectorySelectionModal: React.FC<DirectorySelectionModalProps> = ({ visible, isFileMode = false, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [directoryData, setDirectoryData] = useState<DirectoryData>(EMPTY_DIRECTORY_DATA);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('');

  const loadDirectory = useCallback(
    async (path = '') => {
      setLoading(true);
      try {
        const showFiles = isFileMode ? 'true' : 'false';
        const response = await fetch(`/api/directory/browse?path=${encodeURIComponent(path)}&showFiles=${showFiles}`, {
          method: 'GET',
          credentials: 'include',
        });
        const data: unknown = await response.json();
        const dataRecord = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
        const normalizedData = normalizeDirectoryData(data);

        setDirectoryData(normalizedData);
        setCurrentPath(typeof dataRecord?.currentPath === 'string' ? dataRecord.currentPath : path);

        if (!response.ok) {
          const errorMessage = typeof dataRecord?.error === 'string' ? dataRecord.error : `HTTP ${response.status}`;
          console.error('Directory browse request failed:', errorMessage);
        }
      } catch (error) {
        console.error('Failed to load directory:', error);
        setDirectoryData(EMPTY_DIRECTORY_DATA);
        setCurrentPath(path);
      } finally {
        setLoading(false);
      }
    },
    [isFileMode]
  );

  useEffect(() => {
    if (visible) {
      setSelectedPath('');
      loadDirectory('').catch((error) => console.error('Failed to load initial directory:', error));
    }
  }, [visible, loadDirectory]);

  const handleItemClick = (item: DirectoryItem) => {
    if (item.isDirectory) {
      loadDirectory(item.path).catch((error) => console.error('Failed to load directory:', error));
    }
  };

  // Double-click behavior removed - single click now handles directory navigation
  // 移除双击行为 - 单击现在处理目录导航
  const handleItemDoubleClick = (_item: DirectoryItem) => {
    // No-op: single click already handles navigation
  };

  const handleSelect = (path: string) => {
    setSelectedPath(path);
  };

  const handleGoUp = () => {
    if (directoryData.parentPath !== undefined) {
      loadDirectory(directoryData.parentPath).catch((error) => console.error('Failed to load parent directory:', error));
    }
  };

  const handleConfirm = () => {
    if (selectedPath) {
      onConfirm([selectedPath]);
    }
  };

  const canSelect = (item: DirectoryItem) => {
    return isFileMode ? item.isFile : item.isDirectory;
  };

  return (
    <Modal
      visible={visible}
      title={isFileMode ? '📄 ' + t('fileSelection.selectFile') : '📁 ' + t('fileSelection.selectDirectory')}
      onCancel={onCancel}
      onOk={handleConfirm}
      okButtonProps={{ disabled: !selectedPath }}
      className='w-[90vw] md:w-[600px]'
      style={{ width: 'min(600px, 90vw)' }}
      wrapStyle={{ zIndex: 3000 }}
      maskStyle={{ zIndex: 2990 }}
      footer={
        <div className='w-full flex justify-between items-center'>
          <div className='text-t-secondary text-14px overflow-hidden text-ellipsis whitespace-nowrap max-w-[70vw]' title={selectedPath || currentPath}>
            {selectedPath || currentPath || (isFileMode ? t('fileSelection.pleaseSelectFile') : t('fileSelection.pleaseSelectDirectory'))}
          </div>
          <div className='flex gap-10px'>
            <Button onClick={onCancel}>{t('common.cancel')}</Button>
            <Button type='primary' onClick={handleConfirm} disabled={!selectedPath}>
              {t('common.confirm')}
            </Button>
          </div>
        </div>
      }
    >
      <Spin loading={loading} className='w-full'>
        <div className='w-full border border-b-base rd-4px overflow-hidden' style={{ height: 'min(400px, 60vh)' }}>
          <div className='h-full overflow-y-auto'>
            {directoryData.canGoUp && (
              <div className='flex items-center p-10px border-b border-b-light cursor-pointer hover:bg-hover transition' onClick={handleGoUp}>
                <IconUp className='mr-10px text-t-secondary' />
                <span>..</span>
              </div>
            )}
            {directoryData.items.map((item, index) => (
              <div key={index} className='flex items-center justify-between p-10px border-b border-b-light cursor-pointer hover:bg-hover transition' style={selectedPath === item.path ? { background: 'var(--brand-light)' } : {}} onClick={() => handleItemClick(item)} onDoubleClick={() => handleItemDoubleClick(item)}>
                <div className='flex items-center flex-1 min-w-0'>
                  {item.isDirectory ? <IconFolder className='mr-10px text-warning shrink-0' /> : <IconFile className='mr-10px text-primary shrink-0' />}
                  <span className='overflow-hidden text-ellipsis whitespace-nowrap'>{item.name}</span>
                </div>
                {canSelect(item) && (
                  <Button
                    type='primary'
                    size='mini'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(item.path);
                    }}
                  >
                    {t('common.select')}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Spin>
    </Modal>
  );
};

export default DirectorySelectionModal;
