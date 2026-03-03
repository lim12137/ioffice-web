/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { ASSISTANT_PRESETS } from '@/common/presets/assistantPresets';
import type { IProvider, TProviderWithModel } from '@/common/storage';
import { ConfigStorage } from '@/common/storage';
import { resolveLocaleKey } from '@/common/utils';
import coworkSvg from '@/renderer/assets/cowork.svg';
import AuggieLogo from '@/renderer/assets/logos/auggie.svg';
import ClaudeLogo from '@/renderer/assets/logos/claude.svg';
import CodeBuddyLogo from '@/renderer/assets/logos/codebuddy.svg';
import CodexLogo from '@/renderer/assets/logos/codex.svg';
import DroidLogo from '@/renderer/assets/logos/droid.svg';
import GitHubLogo from '@/renderer/assets/logos/github.svg';
import GooseLogo from '@/renderer/assets/logos/goose.svg';
import IflowLogo from '@/renderer/assets/logos/iflow.svg';
import KimiLogo from '@/renderer/assets/logos/kimi.svg';
import MistralLogo from '@/renderer/assets/logos/mistral.svg';
import NanobotLogo from '@/renderer/assets/logos/nanobot.svg';
import OpenClawLogo from '@/renderer/assets/logos/openclaw.svg';
import OpenCodeLogo from '@/renderer/assets/logos/opencode.svg';
import QoderLogo from '@/renderer/assets/logos/qoder.png';
import QwenLogo from '@/renderer/assets/logos/qwen.svg';
import AgentModeSelector from '@/renderer/components/AgentModeSelector';
import { supportsModeSwitch } from '@/renderer/constants/agentModes';
import FilePreview from '@/renderer/components/FilePreview';
import { useLayoutContext } from '@/renderer/context/LayoutContext';
import { useCompositionInput } from '@/renderer/hooks/useCompositionInput';
import { useDragUpload } from '@/renderer/hooks/useDragUpload';
import { useInputFocusRing } from '@/renderer/hooks/useInputFocusRing';
import { usePasteService } from '@/renderer/hooks/usePasteService';
import { useConversationTabs } from '@/renderer/pages/conversation/context/ConversationTabsContext';
import { allSupportedExts, getCleanFileNames, type FileMetadata } from '@/renderer/services/FileService';
import { iconColors } from '@/renderer/theme/colors';
import { emitter } from '@/renderer/utils/emitter';
import { hasSpecificModelCapability } from '@/renderer/utils/modelCapabilities';
import { updateWorkspaceTime } from '@/renderer/utils/workspaceHistory';
import { isAcpRoutedPresetType, type AcpBackend, type AcpBackendConfig, type PresetAgentType } from '@/types/acpTypes';
import { Button, ConfigProvider, Dropdown, Input, Menu, Message, Tooltip } from '@arco-design/web-react';
import { IconClose } from '@arco-design/web-react/icon';
import { ArrowUp, Down, FolderOpen, Plus, Robot, UploadOne } from '@icon-park/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import useSWR, { mutate } from 'swr';
import styles from './index.module.css';

/**
 * 缂撳瓨Provider鐨勫彲鐢ㄦā鍨嬪垪琛紝閬垮厤閲嶅璁＄畻
 */
const availableModelsCache = new Map<string, string[]>();

/**
 * 鑾峰彇鎻愪緵鍟嗕笅鎵€鏈夊彲鐢ㄧ殑涓诲姏妯″瀷锛堝甫缂撳瓨锛? * @param provider - 鎻愪緵鍟嗛厤缃? * @returns 鍙敤鐨勪富鍔涙ā鍨嬪悕绉版暟缁? */
const getAvailableModels = (provider: IProvider): string[] => {
  // 鐢熸垚缂撳瓨閿紝鍖呭惈妯″瀷鍒楄〃浠ユ娴嬪彉鍖?
  const cacheKey = `${provider.id}-${(provider.model || []).join(',')}`;

  // 妫€鏌ョ紦瀛?
  if (availableModelsCache.has(cacheKey)) {
    return availableModelsCache.get(cacheKey)!;
  }

  // 璁＄畻鍙敤妯″瀷
  const result: string[] = [];
  for (const modelName of provider.model || []) {
    const functionCalling = hasSpecificModelCapability(provider, modelName, 'function_calling');
    const excluded = hasSpecificModelCapability(provider, modelName, 'excludeFromPrimary');

    if ((functionCalling === true || functionCalling === undefined) && excluded !== true) {
      result.push(modelName);
    }
  }

  // 缂撳瓨缁撴灉
  availableModelsCache.set(cacheKey, result);
  return result;
};

/**
 * 妫€鏌ユ彁渚涘晢鏄惁鏈夊彲鐢ㄧ殑涓诲姏瀵硅瘽妯″瀷锛堥珮鏁堢増鏈級
 * @param provider - 鎻愪緵鍟嗛厤缃? * @returns true 琛ㄧず鎻愪緵鍟嗘湁鍙敤妯″瀷锛宖alse 琛ㄧず鏃犲彲鐢ㄦā鍨? */
const hasAvailableModels = (provider: IProvider): boolean => {
  // 鐩存帴浣跨敤缂撳瓨鐨勭粨鏋滐紝閬垮厤閲嶅璁＄畻
  const availableModels = getAvailableModels(provider);
  return availableModels.length > 0;
};

/**
 * 娴嬮噺 textarea 涓寚瀹氫綅缃殑鍨傜洿鍧愭爣
 * @param textarea - 鐩爣 textarea 鍏冪礌
 * @param position - 鏂囨湰浣嶇疆
 * @returns 璇ヤ綅缃殑鍨傜洿鍍忕礌鍧愭爣
 */
const measureCaretTop = (textarea: HTMLTextAreaElement, position: number): number => {
  const textBefore = textarea.value.slice(0, position);
  const measure = document.createElement('div');
  const style = getComputedStyle(textarea);
  measure.style.cssText = `
    position: absolute;
    visibility: hidden;
    white-space: pre-wrap;
    word-wrap: break-word;
    width: ${textarea.clientWidth}px;
    font: ${style.font};
    line-height: ${style.lineHeight};
    padding: ${style.padding};
    border: ${style.border};
    box-sizing: ${style.boxSizing};
  `;
  measure.textContent = textBefore;
  document.body.appendChild(measure);
  const caretTop = measure.scrollHeight;
  document.body.removeChild(measure);
  return caretTop;
};

/**
 * 婊氬姩 textarea 浣垮厜鏍囦綅浜庤鍙ｆ渶鍚庝竴琛? * @param textarea - 鐩爣 textarea 鍏冪礌
 * @param caretTop - 鍏夋爣鐨勫瀭鐩村潗鏍? */
const scrollCaretToLastLine = (textarea: HTMLTextAreaElement, caretTop: number): void => {
  const style = getComputedStyle(textarea);
  const lineHeight = parseInt(style.lineHeight, 10) || 20;
  // 婊氬姩浣垮厜鏍囦綅浜庤鍙ｆ渶鍚庝竴琛?
  textarea.scrollTop = Math.max(0, caretTop - textarea.clientHeight + lineHeight);
};

const useModelList = () => {
  const { data: modelConfig } = useSWR('model.config.welcome', () => {
    return ipcBridge.mode.getModelConfig.invoke().then((data) => {
      return (data || []).filter((platform) => !!platform.model.length);
    });
  });

  const modelList = useMemo(() => {
    const allProviders = modelConfig || [];
    // 杩囨护鍑烘湁鍙敤涓诲姏妯″瀷鐨勬彁渚涘晢
    return allProviders.filter(hasAvailableModels);
  }, [modelConfig]);

  return { modelList };
};

// Agent Logo 鏄犲皠 (custom uses Robot icon from @icon-park/react)
const AGENT_LOGO_MAP: Partial<Record<AcpBackend, string>> = {
  claude: ClaudeLogo,
  qwen: QwenLogo,
  codex: CodexLogo,
  codebuddy: CodeBuddyLogo,
  droid: DroidLogo,
  iflow: IflowLogo,
  goose: GooseLogo,
  auggie: AuggieLogo,
  kimi: KimiLogo,
  opencode: OpenCodeLogo,
  copilot: GitHubLogo,
  qoder: QoderLogo,
  vibe: MistralLogo,
  'openclaw-gateway': OpenClawLogo,
  nanobot: NanobotLogo,
};
const CUSTOM_AVATAR_IMAGE_MAP: Record<string, string> = {
  'cowork.svg': coworkSvg,
};

const Guid: React.FC = () => {
  const { t, i18n } = useTranslation();
  const guidContainerRef = useRef<HTMLDivElement>(null);
  const { closeAllTabs, openTab } = useConversationTabs();
  const { activeBorderColor, inactiveBorderColor, activeShadow } = useInputFocusRing();
  const localeKey = resolveLocaleKey(i18n.language);

  // 鎵撳紑澶栭儴閾炬帴 / Open external link
  const openLink = useCallback(async (url: string) => {
    try {
      await ipcBridge.shell.openExternal.invoke(url);
    } catch (error) {
      console.error('Failed to open external link:', error);
    }
  }, []);
  const location = useLocation();
  const [input, setInput] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionSelectorVisible, setMentionSelectorVisible] = useState(false);
  const [mentionSelectorOpen, setMentionSelectorOpen] = useState(false);
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [dir, setDir] = useState<string>('');
  const [currentModel, _setCurrentModel] = useState<TProviderWithModel>();
  const [isInputFocused, setIsInputFocused] = useState(false);
  const isInputActive = isInputFocused;
  const [hoveredQuickAction, setHoveredQuickAction] = useState<'feedback' | 'repo' | null>(null);
  const quickActionStyle = useCallback(
    (isActive: boolean) => ({
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: inactiveBorderColor,
      boxShadow: isActive ? activeShadow : 'none',
    }),
    [activeBorderColor, activeShadow, inactiveBorderColor]
  );

  // 浠?location.state 涓鍙?workspace锛堜粠 tabs 鐨勬坊鍔犳寜閽紶閫掞級
  useEffect(() => {
    const state = location.state as { workspace?: string } | null;
    if (state?.workspace) {
      setDir(state.workspace);
    }
  }, [location.state]);
  const { modelList } = useModelList();
  // 璁板綍褰撳墠閫変腑鐨?provider+model锛屾柟渚垮垪琛ㄥ埛鏂版椂鍒ゆ柇鏄惁浠嶅彲鐢?
  const selectedModelKeyRef = useRef<string | null>(null);
  // 鏀寔鍦ㄥ垵濮嬪寲椤靛睍绀?Codex锛圡CP锛夐€夐」锛屽厛鍋?UI 鍗犱綅
  // 瀵逛簬鑷畾涔変唬鐞嗭紝浣跨敤 "custom:uuid" 鏍煎紡鏉ュ尯鍒嗗涓嚜瀹氫箟浠ｇ悊
  // For custom agents, we store "custom:uuid" format to distinguish between multiple custom agents
  const [selectedAgentKey, _setSelectedAgentKey] = useState<string>('codex');

  // 灏佽 setSelectedAgentKey 浠ュ悓鏃朵繚瀛樺埌 storage
  // Wrap setSelectedAgentKey to also save to storage
  const setSelectedAgentKey = useCallback((key: string) => {
    _setSelectedAgentKey(key);
    // 淇濆瓨閫夋嫨鍒?storage / Save selection to storage
    ConfigStorage.set('guid.lastSelectedAgent', key).catch((error) => {
      console.error('Failed to save selected agent:', error);
    });
  }, []);
  const [availableAgents, setAvailableAgents] = useState<
    Array<{
      backend: AcpBackend;
      name: string;
      cliPath?: string;
      customAgentId?: string;
      isPreset?: boolean;
      context?: string;
      avatar?: string;
      presetAgentType?: PresetAgentType;
    }>
  >();
  const [customAgents, setCustomAgents] = useState<AcpBackendConfig[]>([]);
  const availableCustomAgentIds = useMemo(() => {
    const ids = new Set<string>();
    (availableAgents || []).forEach((agent) => {
      if (agent.backend === 'custom' && agent.customAgentId) {
        ids.add(agent.customAgentId);
      }
    });
    return ids;
  }, [availableAgents]);

  /**
   * 鑾峰彇浠ｇ悊鐨勫敮涓€閫夋嫨閿?   * 瀵逛簬鑷畾涔変唬鐞嗚繑鍥?"custom:uuid"锛屽叾浠栦唬鐞嗚繑鍥?backend 绫诲瀷
   * Helper to get agent key for selection
   * Returns "custom:uuid" for custom agents, backend type for others
   */
  const getAgentKey = (agent: { backend: AcpBackend; customAgentId?: string }) => {
    return agent.backend === 'custom' && agent.customAgentId ? `custom:${agent.customAgentId}` : agent.backend;
  };

  /**
   * 閫氳繃閫夋嫨閿煡鎵句唬鐞?   * 鏀寔 "custom:uuid" 鏍煎紡鍜屾櫘閫?backend 绫诲瀷
   * Helper to find agent by key
   * Supports both "custom:uuid" format and plain backend type
   */
  const findAgentByKey = (key: string) => {
    if (key.startsWith('custom:')) {
      const customAgentId = key.slice(7);
      // First check availableAgents
      const foundInAvailable = availableAgents?.find((a) => a.backend === 'custom' && a.customAgentId === customAgentId);
      if (foundInAvailable) return foundInAvailable;

      // Then check customAgents for presets
      const assistant = customAgents.find((a) => a.id === customAgentId);
      if (assistant) {
        return {
          backend: 'custom' as AcpBackend,
          name: assistant.name,
          customAgentId: assistant.id,
          isPreset: true,
          context: '', // Context loaded via other means
          avatar: assistant.avatar,
        };
      }
    }
    return availableAgents?.find((a) => a.backend === key);
  };

  // 鑾峰彇閫変腑鐨勫悗绔被鍨嬶紙鍚戝悗鍏煎锛? Get the selected backend type (for backward compatibility)
  const selectedAgent = selectedAgentKey.startsWith('custom:') ? 'custom' : (selectedAgentKey as AcpBackend);
  const selectedAgentInfo = useMemo(() => findAgentByKey(selectedAgentKey), [selectedAgentKey, availableAgents, customAgents]);
  const isPresetAgent = Boolean(selectedAgentInfo?.isPreset);
  const [selectedMode, setSelectedMode] = useState<string>('default');
  const [isPlusDropdownOpen, setIsPlusDropdownOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);
  const [typewriterPlaceholder, setTypewriterPlaceholder] = useState('');
  const [_isTyping, setIsTyping] = useState(true);
  const mentionMatchRegex = useMemo(() => /(?:^|\s)@([^\s@]*)$/, []);

  /**
   * 鐢熸垚鍞竴妯″瀷 key锛坧roviderId:model锛?   * Build a unique key for provider/model pair
   */
  const buildModelKey = (providerId?: string, modelName?: string) => {
    if (!providerId || !modelName) return null;
    return `${providerId}:${modelName}`;
  };

  /**
   * 妫€鏌ュ綋鍓?key 鏄惁浠嶅瓨鍦ㄤ簬鏂版ā鍨嬪垪琛ㄤ腑
   * Check if selected model key still exists in the new provider list
   */
  const isModelKeyAvailable = (key: string | null, providers?: IProvider[]) => {
    if (!key || !providers || providers.length === 0) return false;
    return providers.some((provider) => {
      if (!provider.id || !provider.model?.length) return false;
      return provider.model.some((modelName) => buildModelKey(provider.id, modelName) === key);
    });
  };

  const setCurrentModel = async (modelInfo: TProviderWithModel) => {
    // 璁板綍鏈€鏂扮殑閫変腑 key锛岄伩鍏嶅垪琛ㄥ埛鏂板悗琚敊璇噸缃?
    selectedModelKeyRef.current = buildModelKey(modelInfo.id, modelInfo.useModel);
    await ConfigStorage.set('guid.defaultModel', { id: modelInfo.id, useModel: modelInfo.useModel }).catch((error) => {
      console.error('Failed to save default model:', error);
    });
    _setCurrentModel(modelInfo);
  };
  const navigate = useNavigate();
  const _layout = useLayoutContext();

  // 澶勭悊绮樿创鐨勬枃浠讹紙杩藉姞妯″紡锛屾敮鎸佸娆＄矘璐达級
  // Handle pasted files (append mode to support multiple pastes)
  const handleFilesPasted = useCallback((pastedFiles: FileMetadata[]) => {
    const filePaths = pastedFiles.map((file) => file.path);
    // 绮樿创鎿嶄綔杩藉姞鍒扮幇鏈夋枃浠跺垪琛?    // Paste operation appends to existing files
    setFiles((prevFiles) => [...prevFiles, ...filePaths]);
    setDir('');
  }, []);

  // 澶勭悊閫氳繃瀵硅瘽妗嗕笂浼犵殑鏂囦欢锛堣拷鍔犳ā寮忥級
  // Handle files uploaded via dialog (append mode)
  const handleFilesUploaded = useCallback((uploadedPaths: string[]) => {
    setFiles((prevFiles) => [...prevFiles, ...uploadedPaths]);
  }, []);

  const handleRemoveFile = useCallback((targetPath: string) => {
    // 鍒犻櫎鍒濆鍖栭潰鏉夸腑鐨勫凡閫夋枃浠?/ Remove files already selected on the welcome screen
    setFiles((prevFiles) => prevFiles.filter((file) => file !== targetPath));
  }, []);

  // 浣跨敤鎷栨嫿 hook锛堟嫋鎷借涓虹矘璐存搷浣滐紝杩藉姞鍒扮幇鏈夋枃浠讹級
  // Use drag upload hook (drag is treated like paste, appends to existing files)
  const { isFileDragging, dragHandlers } = useDragUpload({
    supportedExts: allSupportedExts,
    onFilesAdded: handleFilesPasted,
  });

  // 浣跨敤鍏变韩鐨凱asteService闆嗘垚锛堢矘璐存搷浣滆拷鍔犲埌鐜版湁鏂囦欢锛?  // Use shared PasteService integration (paste appends to existing files)
  const { onPaste, onFocus } = usePasteService({
    supportedExts: allSupportedExts,
    onFilesAdded: handleFilesPasted,
    onTextPaste: (text: string) => {
      // 鎸夊厜鏍囦綅缃彃鍏ユ枃鏈紝淇濇寔鐜版湁鍐呭
      const textarea = document.activeElement as HTMLTextAreaElement | null;
      if (textarea && textarea.tagName === 'TEXTAREA') {
        const start = textarea.selectionStart ?? textarea.value.length;
        const end = textarea.selectionEnd ?? start;
        const currentValue = textarea.value;
        const newValue = currentValue.slice(0, start) + text + currentValue.slice(end);
        setInput(newValue);

        setTimeout(() => {
          const newPos = start + text.length;
          textarea.setSelectionRange(newPos, newPos);
          const caretTop = measureCaretTop(textarea, newPos);
          scrollCaretToLastLine(textarea, caretTop);
        }, 0);
      } else {
        setInput((prev) => prev + text);
      }
    },
  });
  const handleTextareaFocus = useCallback(() => {
    onFocus();
    setIsInputFocused(true);
  }, [onFocus]);
  const handleTextareaBlur = useCallback(() => {
    setIsInputFocused(false);
  }, []);

  const customAgentAvatarMap = useMemo(() => {
    return new Map(customAgents.map((agent) => [agent.id, agent.avatar]));
  }, [customAgents]);

  const mentionOptions = useMemo(() => {
    const agents = availableAgents || [];
    return agents.map((agent) => {
      const key = getAgentKey(agent);
      const label = agent.name || agent.backend;
      const avatarValue = agent.backend === 'custom' ? agent.avatar || customAgentAvatarMap.get(agent.customAgentId || '') : undefined;
      const avatar = avatarValue ? avatarValue.trim() : undefined;
      const tokens = new Set<string>();
      const normalizedLabel = label.toLowerCase();
      tokens.add(normalizedLabel);
      tokens.add(normalizedLabel.replace(/\s+/g, '-'));
      tokens.add(normalizedLabel.replace(/\s+/g, ''));
      tokens.add(agent.backend.toLowerCase());
      if (agent.customAgentId) {
        tokens.add(agent.customAgentId.toLowerCase());
      }
      return {
        key,
        label,
        tokens,
        avatar,
        avatarImage: avatar ? CUSTOM_AVATAR_IMAGE_MAP[avatar] : undefined,
        logo: AGENT_LOGO_MAP[agent.backend],
      };
    });
  }, [availableAgents, customAgentAvatarMap]);

  const filteredMentionOptions = useMemo(() => {
    if (!mentionQuery) return mentionOptions;
    const query = mentionQuery.toLowerCase();
    return mentionOptions.filter((option) => Array.from(option.tokens).some((token) => token.startsWith(query)));
  }, [mentionOptions, mentionQuery]);

  const stripMentionToken = useCallback(
    (value: string) => {
      if (!mentionMatchRegex.test(value)) return value;
      return value.replace(mentionMatchRegex, (_match, _query) => '').trimEnd();
    },
    [mentionMatchRegex]
  );

  const selectMentionAgent = useCallback(
    (key: string) => {
      setSelectedAgentKey(key);
      setInput((prev) => stripMentionToken(prev));
      setMentionOpen(false);
      setMentionSelectorOpen(false);
      setMentionSelectorVisible(true);
      setMentionQuery(null);
      setMentionActiveIndex(0);
    },
    [stripMentionToken]
  );

  const selectedAgentLabel = selectedAgentInfo?.name || selectedAgentKey;
  const mentionMenuActiveOption = filteredMentionOptions[mentionActiveIndex] || filteredMentionOptions[0];
  const mentionMenuSelectedKey = mentionOpen || mentionSelectorOpen ? mentionMenuActiveOption?.key || selectedAgentKey : selectedAgentKey;
  const mentionMenuRef = useRef<HTMLDivElement>(null);

  const mentionMenu = useMemo(
    () => (
      <div ref={mentionMenuRef} className='bg-bg-2 border border-[var(--color-border-2)] rd-12px shadow-lg overflow-hidden' style={{ boxShadow: '0 0 0 1px var(--color-border-2), 0 12px 24px rgba(0, 0, 0, 0.12)' }}>
        <Menu selectedKeys={[mentionMenuSelectedKey]} onClickMenuItem={(key) => selectMentionAgent(String(key))} className='min-w-180px max-h-200px overflow-auto'>
          {filteredMentionOptions.length > 0 ? (
            filteredMentionOptions.map((option, index) => (
              <Menu.Item key={option.key} data-mention-index={index}>
                <div className='flex items-center gap-8px'>
                  {option.avatarImage ? <img src={option.avatarImage} alt='' width={16} height={16} style={{ objectFit: 'contain' }} /> : option.avatar ? <span style={{ fontSize: 14, lineHeight: '16px' }}>{option.avatar}</span> : option.logo ? <img src={option.logo} alt={option.label} width={16} height={16} style={{ objectFit: 'contain' }} /> : <Robot theme='outline' size={16} />}
                  <span>{option.label}</span>
                </div>
              </Menu.Item>
            ))
          ) : (
            <Menu.Item key='empty' disabled>
              {t('conversation.welcome.none', { defaultValue: 'None' })}
            </Menu.Item>
          )}
        </Menu>
      </div>
    ),
    [filteredMentionOptions, mentionMenuSelectedKey, selectMentionAgent, t]
  );

  // 鑾峰彇鍙敤鐨?ACP agents - 鍩轰簬鍏ㄥ眬鏍囪浣?
  const { data: availableAgentsData } = useSWR('acp.agents.available', async () => {
    const result = await ipcBridge.acpConversation.getAvailableAgents.invoke();
    if (result.success) {
      return result.data;
    }
    return [];
  });

  // 鏇存柊鏈湴鐘舵€?
  useEffect(() => {
    if (availableAgentsData) {
      setAvailableAgents(availableAgentsData);
    }
  }, [availableAgentsData]);

  // 鍔犺浇涓婃閫夋嫨鐨?agent / Load last selected agent
  useEffect(() => {
    if (!availableAgents || availableAgents.length === 0) return;

    let cancelled = false;

    const loadLastSelectedAgent = async () => {
      try {
        const savedAgentKey = await ConfigStorage.get('guid.lastSelectedAgent');
        if (cancelled || !savedAgentKey) return;

        // 1. Check availableAgents first
        const isInAvailable = availableAgents.some((agent) => {
          const key = agent.backend === 'custom' && agent.customAgentId ? `custom:${agent.customAgentId}` : agent.backend;
          return key === savedAgentKey;
        });

        if (isInAvailable) {
          _setSelectedAgentKey(savedAgentKey);
          return;
        }
      } catch (error) {
        console.error('Failed to load last selected agent:', error);
      }
    };

    void loadLastSelectedAgent();

    return () => {
      cancelled = true;
    };
  }, [availableAgents]);

  useEffect(() => {
    let isActive = true;
    ConfigStorage.get('acp.customAgents')
      .then((agents) => {
        if (!isActive) return;
        const list = (agents || []).filter((agent: AcpBackendConfig) => availableCustomAgentIds.has(agent.id));
        setCustomAgents(list);
      })
      .catch((error) => {
        console.error('Failed to load custom agents:', error);
      });
    return () => {
      isActive = false;
    };
  }, [availableCustomAgentIds]);

  useEffect(() => {
    if (mentionOpen) {
      setMentionActiveIndex(0);
      return;
    }
    if (mentionSelectorOpen) {
      const selectedIndex = filteredMentionOptions.findIndex((option) => option.key === selectedAgentKey);
      setMentionActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [filteredMentionOptions, mentionOpen, mentionQuery, mentionSelectorOpen, selectedAgentKey]);

  useEffect(() => {
    if (!mentionOpen && !mentionSelectorOpen) return;
    const container = mentionMenuRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLElement>(`[data-mention-index="${mentionActiveIndex}"]`);
    if (!target) return;
    target.scrollIntoView({ block: 'nearest' });
  }, [mentionActiveIndex, mentionOpen, mentionSelectorOpen]);

  // Read legacy yoloMode config (from old SecurityModalContent settings).
  // If yoloMode was enabled for the selected agent, pre-select YOLO mode.
  // If false, keep default 鈥?no action needed.
  useEffect(() => {
    setSelectedMode('default'); // Reset on agent change
    if (!selectedAgent) return;

    const readLegacyYoloMode = async () => {
      try {
        let yoloMode = false;
        if (selectedAgent === 'codex') {
          const config = await ConfigStorage.get('codex.config');
          yoloMode = config?.yoloMode ?? false;
        } else if (selectedAgent !== 'custom' && selectedAgent !== 'openclaw-gateway' && selectedAgent !== 'nanobot') {
          const config = await ConfigStorage.get('acp.config');
          yoloMode = (config?.[selectedAgent as AcpBackend] as any)?.yoloMode ?? false;
        }
        if (yoloMode) {
          // Map to the correct yolo mode value for this backend
          const yoloValues: Record<string, string> = {
            claude: 'bypassPermissions',
            codex: 'yolo',
            iflow: 'yolo',
            qwen: 'yolo',
          };
          setSelectedMode(yoloValues[selectedAgent] || 'yolo');
        }
      } catch {
        /* silent */
      }
    };
    void readLegacyYoloMode();
  }, [selectedAgent]);

  const { compositionHandlers, isComposing } = useCompositionInput();

  /**
   * 瑙ｆ瀽棰勮鍔╂墜鐨?rules 鍜?skills
   * Resolve preset assistant rules and skills
   *
   * - rules: 绯荤粺瑙勫垯锛屽湪浼氳瘽鍒濆鍖栨椂娉ㄥ叆鍒?userMemory
   * - skills: 鎶€鑳藉畾涔夛紝鍦ㄩ娆¤姹傛椂娉ㄥ叆鍒版秷鎭墠缂€
   */
  const resolvePresetRulesAndSkills = useCallback(
    async (agentInfo: { backend: AcpBackend; customAgentId?: string; context?: string } | undefined): Promise<{ rules?: string; skills?: string }> => {
      if (!agentInfo) return {};
      if (agentInfo.backend !== 'custom') {
        return { rules: agentInfo.context };
      }

      const customAgentId = agentInfo.customAgentId;
      if (!customAgentId) return { rules: agentInfo.context };

      let rules = '';
      let skills = '';

      // 1. 鍔犺浇 rules / Load rules
      try {
        rules = await ipcBridge.fs.readAssistantRule.invoke({
          assistantId: customAgentId,
          locale: localeKey,
        });
      } catch (error) {
        console.warn(`Failed to load rules for ${customAgentId}:`, error);
      }

      // 2. 鍔犺浇 skills / Load skills
      try {
        skills = await ipcBridge.fs.readAssistantSkill.invoke({
          assistantId: customAgentId,
          locale: localeKey,
        });
      } catch (error) {
        // skills 鍙兘涓嶅瓨鍦紝杩欐槸姝ｅ父鐨?/ skills may not exist, this is normal
      }

      // 3. Fallback: 濡傛灉鏄唴缃姪鎵嬩笖鏂囦欢涓虹┖锛屼粠鍐呯疆璧勬簮鍔犺浇
      // Fallback: If builtin assistant and files are empty, load from builtin resources
      if (customAgentId.startsWith('builtin-')) {
        const presetId = customAgentId.replace('builtin-', '');
        const preset = ASSISTANT_PRESETS.find((p) => p.id === presetId);
        if (preset) {
          // Fallback for rules
          if (!rules && preset.ruleFiles) {
            try {
              const ruleFile = preset.ruleFiles[localeKey] || preset.ruleFiles['en-US'];
              if (ruleFile) {
                rules = await ipcBridge.fs.readBuiltinRule.invoke({ fileName: ruleFile });
              }
            } catch (e) {
              console.warn(`Failed to load builtin rules for ${customAgentId}:`, e);
            }
          }
          // Fallback for skills
          if (!skills && preset.skillFiles) {
            try {
              const skillFile = preset.skillFiles[localeKey] || preset.skillFiles['en-US'];
              if (skillFile) {
                skills = await ipcBridge.fs.readBuiltinSkill.invoke({ fileName: skillFile });
              }
            } catch (e) {
              // skills fallback failure is ok
            }
          }
        }
      }

      return { rules: rules || agentInfo.context, skills };
    },
    [localeKey]
  );

  const resolvePresetAgentType = useCallback(
    (agentInfo: { backend: AcpBackend; customAgentId?: string } | undefined) => {
      if (!agentInfo) return 'codex';
      // 闈?custom 鐨?backend锛岀洿鎺ヨ繑鍥炲叾 backend 绫诲瀷锛堝 'claude', 'codex' 绛夛級
      // For non-custom backends, return the backend type directly (e.g., 'claude', 'codex', etc.)
      if (agentInfo.backend !== 'custom') return agentInfo.backend as PresetAgentType;
      const customAgent = customAgents.find((agent) => agent.id === agentInfo.customAgentId);
      return customAgent?.presetAgentType || 'codex';
    },
    [customAgents]
  );

  // 瑙ｆ瀽鍔╂墜鍚敤鐨?skills 鍒楄〃 / Resolve enabled skills for the assistant
  const resolveEnabledSkills = useCallback(
    (agentInfo: { backend: AcpBackend; customAgentId?: string } | undefined): string[] | undefined => {
      if (!agentInfo) return undefined;
      if (agentInfo.backend !== 'custom') return undefined;
      const customAgent = customAgents.find((agent) => agent.id === agentInfo.customAgentId);
      return customAgent?.enabledSkills;
    },
    [customAgents]
  );

  /**
   * 妫€鏌?Main Agent 绫诲瀷鏄惁鍙敤锛堢敤浜庨璁惧姪鎵嬬殑鑷姩鍒囨崲鍒ゆ柇锛?   * Check if a Main Agent type is available (for preset assistant auto-switch)
   *
   * - claude/codex/opencode: 妫€鏌?availableAgents 涓槸鍚︽湁瀵瑰簲鐨?backend锛圕LI 宸插畨瑁咃級
   */
  const isMainAgentAvailable = useCallback(
    (agentType: PresetAgentType): boolean => {
      if (agentType === 'gemini') {
        return false;
      }
      // 鍏朵粬绫诲瀷妫€鏌?availableAgents锛圕LI 鏄惁宸插畨瑁咃級
      // Other types check availableAgents (whether CLI is installed)
      return availableAgents?.some((agent) => agent.backend === agentType) ?? false;
    },
    [availableAgents]
  );

  /**
   * 鑾峰彇鍙敤鐨勫閫?Main Agent
   * Get an available fallback Main Agent
   *
   * Priority: claude > codex > codebuddy > opencode
   */
  const getAvailableFallbackAgent = useCallback((): PresetAgentType | null => {
    const fallbackOrder: PresetAgentType[] = ['claude', 'codex', 'codebuddy', 'opencode'];
    for (const agentType of fallbackOrder) {
      if (isMainAgentAvailable(agentType)) {
        return agentType;
      }
    }
    return null;
  }, [isMainAgentAvailable]);

  /**
   * 鑾峰彇鍔╂墜鐨勬湁鏁?Main Agent 绫诲瀷锛堜粎鐢ㄤ簬 UI 鏄剧ず锛?   * Get the effective Main Agent type for an assistant (for UI display only)
   *
   * 娉ㄦ剰锛氫笉鍐嶆彁鍓嶈绠?fallback锛屽洜涓?CLI agents 闇€瑕佸紓姝ュ仴搴锋鏌?   * 瀹為檯鐨?agent 鍒囨崲鍦ㄥ彂閫佹椂閫氳繃鍋ュ悍妫€鏌ヨ繘琛?   * Note: No longer pre-computing fallback since CLI agents require async health check
   * Actual agent switching happens at send time via health check
   */
  const getEffectiveAgentType = useCallback(
    (agentInfo: { backend: AcpBackend; customAgentId?: string } | undefined): { agentType: PresetAgentType; isFallback: boolean; originalType: PresetAgentType; isAvailable: boolean } => {
      const originalType = resolvePresetAgentType(agentInfo);

      // 妫€鏌ュ師濮嬬被鍨嬫槸鍚﹀彲鐢?/ Check if original type is available
      // 瀵逛簬 Gemini锛氬彲浠ュ悓姝ユ鏌ワ紙鐧诲綍鐘舵€佹垨 API key锛?      // 瀵逛簬 CLI agents锛氳繖閲屽彧妫€鏌?CLI 瀹夎锛岀湡姝ｇ殑璁よ瘉妫€鏌ュ湪鍙戦€佹椂杩涜
      // For Gemini: can check synchronously (login status or API key)
      // For CLI agents: only checks CLI installation here, real auth check happens at send time
      const isAvailable = isMainAgentAvailable(originalType);

      // 涓嶅啀鎻愬墠璁剧疆 isFallback锛屽洜涓?CLI agents 鐨勫彲鐢ㄦ€ч渶瑕佸紓姝ユ鏌?      // No longer setting isFallback upfront since CLI agent availability requires async check
      // 鐢ㄦ埛浼氱湅鍒板師濮嬮€夋嫨鐨?agent锛屽疄闄呭垏鎹㈠湪鍙戦€佹椂杩涜
      // User sees their originally selected agent, actual switch happens at send time
      return { agentType: originalType, isFallback: false, originalType, isAvailable };
    },
    [resolvePresetAgentType, isMainAgentAvailable]
  );

  /**
   * 褰撳墠閫変腑鍔╂墜鐨勬湁鏁?Agent 绫诲瀷锛堢敤浜?UI 鏄剧ず锛?   * Effective agent type for the currently selected assistant (for UI display)
   */
  const currentEffectiveAgentInfo = useMemo(() => {
    if (!isPresetAgent) {
      // 闈為璁惧姪鎵嬶紝妫€鏌ラ€変腑鐨?agent 鏄惁鍙敤
      // For non-preset agents, check if selected agent is available
      const isAvailable = isMainAgentAvailable(selectedAgent as PresetAgentType);
      return { agentType: selectedAgent as PresetAgentType, isFallback: false, originalType: selectedAgent as PresetAgentType, isAvailable };
    }
    return getEffectiveAgentType(selectedAgentInfo);
  }, [isPresetAgent, selectedAgent, selectedAgentInfo, getEffectiveAgentType, isMainAgentAvailable]);

  const refreshCustomAgents = useCallback(async () => {
    try {
      await ipcBridge.acpConversation.refreshCustomAgents.invoke();
      await mutate('acp.agents.available');
    } catch (error) {
      console.error('Failed to refresh custom agents:', error);
    }
  }, []);

  useEffect(() => {
    void refreshCustomAgents();
  }, [refreshCustomAgents]);

  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);
      const match = value.match(mentionMatchRegex);
      if (match) {
        setMentionQuery(match[1]);
        setMentionOpen(true);
        setMentionSelectorOpen(false);
      } else {
        setMentionQuery(null);
        setMentionOpen(false);
      }
    },
    [mentionMatchRegex]
  );

  const handleSend = async () => {
    // 鐢ㄦ埛鏄庣‘閫夋嫨鐨勭洰褰?-> customWorkspace = true, 浣跨敤鐢ㄦ埛閫夋嫨鐨勭洰褰?
    // 鏈€夋嫨鏃?-> customWorkspace = false, 浼犵┖璁╁悗绔垱寤轰复鏃剁洰褰?(gemini-temp-xxx)
    const isCustomWorkspace = !!dir;
    const finalWorkspace = dir || ''; // 涓嶆寚瀹氭椂浼犵┖锛岃鍚庣鍒涘缓涓存椂鐩綍

    const agentInfo = selectedAgentInfo;
    const isPreset = isPresetAgent;
    const selectedAgentForRouting = selectedAgent === 'gemini' ? 'codex' : selectedAgent;

    if (!currentModel) {
      Message.warning(t('conversation.welcome.selectModel'));
      return;
    }

    // 鑾峰彇鏈夋晥鐨?Agent 绫诲瀷锛堣€冭檻鍙敤鎬у洖閫€锛? Get effective agent type (with availability fallback)
    // 娉ㄦ剰锛歩sAvailable 鍙鏌?CLI 瀹夎鐘舵€侊紝鐪熸鐨勮璇佹鏌ュ湪鍙戦€佹椂閫氳繃鍋ュ悍妫€鏌ヨ繘琛?
    // Note: isAvailable only checks CLI installation, real auth check happens at send time via health check
    const { agentType: effectiveAgentType } = getEffectiveAgentType(agentInfo);

    // 鍔犺浇 rules锛坰kills 宸茶縼绉诲埌 SkillManager锛? Load rules (skills migrated to SkillManager)
    const { rules: presetRules } = await resolvePresetRulesAndSkills(agentInfo);
    // 鑾峰彇鍚敤鐨?skills 鍒楄〃 / Get enabled skills list
    const enabledSkills = resolveEnabledSkills(agentInfo);

    // 瀵逛簬棰勮鍔╂墜锛屽綋 Main Agent 涓嶅彲鐢ㄦ椂鑷姩鍒囨崲鍒颁笅涓€涓彲鐢ㄧ殑 Agent
    // For preset assistants, auto-switch to next available agent when Main Agent is unavailable
    let finalEffectiveAgentType = effectiveAgentType;
    if (isPreset && !isMainAgentAvailable(effectiveAgentType)) {
      const fallback = getAvailableFallbackAgent();
      if (fallback && fallback !== effectiveAgentType) {
        finalEffectiveAgentType = fallback;
        Message.info(
          t('guid.autoSwitchedAgent', {
            defaultValue: `${effectiveAgentType} is not available, switched to ${fallback}`,
            from: effectiveAgentType,
            to: fallback,
          })
        );
      }
    }

    if (selectedAgentForRouting === 'codex' || finalEffectiveAgentType === 'codex') {
      // Codex conversation type (including preset with codex agent type)
      const codexAgentInfo = agentInfo || findAgentByKey(selectedAgentKey);

      // 鍒涘缓 Codex 浼氳瘽骞朵繚瀛樺垵濮嬫秷鎭紝鐢卞璇濋〉璐熻矗鍙戦€?
      try {
        const conversation = await ipcBridge.conversation.create.invoke({
          type: 'codex',
          name: input,
          model: currentModel!, // not used by codex, but required by type
          extra: {
            defaultFiles: files,
            workspace: finalWorkspace,
            customWorkspace: isCustomWorkspace,
            // Pass preset context (rules only)
            presetContext: isPreset ? presetRules : undefined,
            // 鍚敤鐨?skills 鍒楄〃锛堥€氳繃 SkillManager 鍔犺浇锛? Enabled skills list (loaded via SkillManager)
            enabledSkills: isPreset ? enabledSkills : undefined,
            // 棰勮鍔╂墜 ID锛岀敤浜庡湪浼氳瘽闈㈡澘鏄剧ず鍔╂墜鍚嶇О鍜屽ご鍍?            // Preset assistant ID for displaying name and avatar in conversation panel
            presetAssistantId: isPreset ? codexAgentInfo?.customAgentId : undefined,
            // Initial session mode from Guid page mode selector
            sessionMode: selectedMode,
          },
        });

        if (!conversation || !conversation.id) {
          console.error('Failed to create Codex conversation - conversation object is null or missing id');
          return;
        }

        // 鏇存柊 workspace 鏃堕棿鎴筹紝纭繚鍒嗙粍浼氳瘽鑳芥纭帓搴忥紙浠呰嚜瀹氫箟宸ヤ綔绌洪棿锛?
        if (isCustomWorkspace) {
          closeAllTabs();
          updateWorkspaceTime(finalWorkspace);
          // 灏嗘柊浼氳瘽娣诲姞鍒?tabs
          openTab(conversation);
        }

        // 绔嬪嵆瑙﹀彂鍒锋柊锛岃宸︿晶鏍忓紑濮嬪姞杞芥柊浼氳瘽锛堝湪瀵艰埅鍓嶏級
        emitter.emit('chat.history.refresh');

        // 浜ょ粰瀵硅瘽椤靛彂閫侊紝閬垮厤浜嬩欢涓㈠け
        const initialMessage = {
          input,
          files: files.length > 0 ? files : undefined,
        };
        sessionStorage.setItem(`codex_initial_message_${conversation.id}`, JSON.stringify(initialMessage));

        // 鐒跺悗瀵艰埅鍒颁細璇濋〉闈?
        await navigate(`/conversation/${conversation.id}`);
      } catch (error: unknown) {
        // 闈欓粯澶勭悊閿欒锛岃浼氳瘽闈㈡澘澶勭悊
        // Silently handle errors, let conversation panel handle it
        console.error('Failed to create Codex conversation:', error);
        throw error;
      }
      return;
    } else if (selectedAgentForRouting === 'openclaw-gateway') {
      // OpenClaw Gateway conversation type (WebSocket mode)
      const openclawAgentInfo = agentInfo || findAgentByKey(selectedAgentKey);

      try {
        const conversation = await ipcBridge.conversation.create.invoke({
          type: 'openclaw-gateway',
          name: input,
          model: currentModel!, // not used by openclaw, but required by type
          extra: {
            defaultFiles: files,
            workspace: finalWorkspace,
            customWorkspace: isCustomWorkspace,
            backend: openclawAgentInfo?.backend,
            cliPath: openclawAgentInfo?.cliPath,
            agentName: openclawAgentInfo?.name,
            runtimeValidation: {
              expectedWorkspace: finalWorkspace,
              expectedBackend: openclawAgentInfo?.backend,
              expectedAgentName: openclawAgentInfo?.name,
              expectedCliPath: openclawAgentInfo?.cliPath,
              expectedModel: currentModel?.useModel,
              switchedAt: Date.now(),
            },
            // Gateway configuration is handled by OpenClawAgentManager
            // 鍚敤鐨?skills 鍒楄〃锛堥€氳繃 SkillManager 鍔犺浇锛? Enabled skills list (loaded via SkillManager)
            enabledSkills: isPreset ? enabledSkills : undefined,
            // 棰勮鍔╂墜 ID锛岀敤浜庡湪浼氳瘽闈㈡澘鏄剧ず鍔╂墜鍚嶇О鍜屽ご鍍?            // Preset assistant ID for displaying name and avatar in conversation panel
            presetAssistantId: isPreset ? openclawAgentInfo?.customAgentId : undefined,
          },
        });

        if (!conversation || !conversation.id) {
          alert('Failed to create OpenClaw conversation. Please ensure the OpenClaw Gateway is running.');
          return;
        }

        // 鏇存柊 workspace 鏃堕棿鎴筹紝纭繚鍒嗙粍浼氳瘽鑳芥纭帓搴忥紙浠呰嚜瀹氫箟宸ヤ綔绌洪棿锛?
        if (isCustomWorkspace) {
          closeAllTabs();
          updateWorkspaceTime(finalWorkspace);
          // 灏嗘柊浼氳瘽娣诲姞鍒?tabs
          openTab(conversation);
        }

        // 绔嬪嵆瑙﹀彂鍒锋柊锛岃宸︿晶鏍忓紑濮嬪姞杞芥柊浼氳瘽锛堝湪瀵艰埅鍓嶏級
        emitter.emit('chat.history.refresh');

        // Store initial message to be picked up by the conversation page
        const initialMessage = {
          input,
          files: files.length > 0 ? files : undefined,
        };
        sessionStorage.setItem(`openclaw_initial_message_${conversation.id}`, JSON.stringify(initialMessage));

        // 鐒跺悗瀵艰埅鍒颁細璇濋〉闈?
        await navigate(`/conversation/${conversation.id}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Failed to create OpenClaw conversation: ${errorMessage}`);
        throw error;
      }
      return;
    } else if (selectedAgentForRouting === 'nanobot') {
      // Nanobot conversation type (standalone CLI agent, not ACP)
      const nanobotAgentInfo = agentInfo || findAgentByKey(selectedAgentKey);

      try {
        const conversation = await ipcBridge.conversation.create.invoke({
          type: 'nanobot',
          name: input,
          model: currentModel!, // not used by nanobot, but required by type
          extra: {
            defaultFiles: files,
            workspace: finalWorkspace,
            customWorkspace: isCustomWorkspace,
            enabledSkills: isPreset ? enabledSkills : undefined,
            presetAssistantId: isPreset ? nanobotAgentInfo?.customAgentId : undefined,
          },
        });

        if (!conversation || !conversation.id) {
          alert('Failed to create Nanobot conversation. Please ensure nanobot is installed.');
          return;
        }

        if (isCustomWorkspace) {
          closeAllTabs();
          updateWorkspaceTime(finalWorkspace);
          openTab(conversation);
        }

        emitter.emit('chat.history.refresh');

        // Store initial message to be picked up by NanobotSendBox
        const initialMessage = {
          input,
          files: files.length > 0 ? files : undefined,
        };
        sessionStorage.setItem(`nanobot_initial_message_${conversation.id}`, JSON.stringify(initialMessage));

        await navigate(`/conversation/${conversation.id}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Failed to create Nanobot conversation: ${errorMessage}`);
        throw error;
      }
      return;
    } else {
      // ACP conversation type (including preset with claude agent type)
      // For preset with ACP-routed agent type (claude/opencode), use corresponding backend
      // Check if agent type changed from user selection (due to availability fallback or compatibility switch)
      const agentTypeChanged = selectedAgentForRouting !== finalEffectiveAgentType;
      const acpBackend: PresetAgentType | undefined = agentTypeChanged
        ? finalEffectiveAgentType // Agent type changed from selection, use the final effective type
        : isPreset && isAcpRoutedPresetType(finalEffectiveAgentType)
          ? finalEffectiveAgentType
          : selectedAgentForRouting;

      // Get the agent info for the actual backend being used (might be different from selection after type change)
      const acpAgentInfo = agentTypeChanged ? findAgentByKey(acpBackend as string) : agentInfo || findAgentByKey(selectedAgentKey);

      // 涓嶅湪 guid 椤甸潰鍋?CLI agents 鍋ュ悍妫€鏌ュ拰鑷姩鍒囨崲锛岃浼氳瘽闈㈡澘鐨?AgentSetupCard 鏉ュ鐞?      // Don't do CLI agents health check and auto-switch in guid page, let conversation panel's AgentSetupCard handle it

      // 涓嶉樆姝㈡祦绋嬶紝璁╀細璇濋潰鏉垮鐞?agent 鍙敤鎬?      // Don't block flow, let conversation panel handle agent availability
      if (!acpAgentInfo && !isPreset) {
        console.warn(`${acpBackend} CLI not found, but proceeding to let conversation panel handle it.`);
      }

      try {
        // CLI agents (claude, opencode) 浣跨敤 ACP 浼氳瘽绫诲瀷
        // CLI agents (claude, opencode) use ACP conversation type
        const conversation = await ipcBridge.conversation.create.invoke({
          type: 'acp',
          name: input,
          model: currentModel!, // ACP needs a model too
          extra: {
            defaultFiles: files,
            workspace: finalWorkspace,
            customWorkspace: isCustomWorkspace,
            backend: acpBackend,
            cliPath: acpAgentInfo?.cliPath,
            agentName: acpAgentInfo?.name, // 瀛樺偍鑷畾涔変唬鐞嗙殑閰嶇疆鍚嶇О / Store configured name for custom agents
            customAgentId: acpAgentInfo?.customAgentId, // 鑷畾涔変唬鐞嗙殑 UUID / UUID for custom agents
            // Pass preset context (rules only)
            presetContext: isPreset ? presetRules : undefined,
            // 鍚敤鐨?skills 鍒楄〃锛堥€氳繃 SkillManager 鍔犺浇锛? Enabled skills list (loaded via SkillManager)
            enabledSkills: isPreset ? enabledSkills : undefined,
            // 棰勮鍔╂墜 ID锛岀敤浜庡湪浼氳瘽闈㈡澘鏄剧ず鍔╂墜鍚嶇О鍜屽ご鍍?            // Preset assistant ID for displaying name and avatar in conversation panel
            // 浣跨敤鍘熷 agentInfo 鐨?ID锛岀‘淇?agent 绫诲瀷鍒囨崲鍚庝粛淇濈暀棰勮鍔╂墜淇℃伅
            // Use original agentInfo's ID to preserve preset assistant info after agent type fallback
            presetAssistantId: isPreset ? agentInfo?.customAgentId || acpAgentInfo?.customAgentId : undefined,
            // Initial session mode from Guid page mode selector
            sessionMode: selectedMode,
          },
        });

        if (!conversation || !conversation.id) {
          console.error('Failed to create ACP conversation - conversation object is null or missing id');
          return;
        }

        // 鏇存柊 workspace 鏃堕棿鎴筹紝纭繚鍒嗙粍浼氳瘽鑳芥纭帓搴忥紙浠呰嚜瀹氫箟宸ヤ綔绌洪棿锛?
        if (isCustomWorkspace) {
          closeAllTabs();
          updateWorkspaceTime(finalWorkspace);
          // 灏嗘柊浼氳瘽娣诲姞鍒?tabs
          openTab(conversation);
        }

        // 绔嬪嵆瑙﹀彂鍒锋柊锛岃宸︿晶鏍忓紑濮嬪姞杞芥柊浼氳瘽锛堝湪瀵艰埅鍓嶏級
        emitter.emit('chat.history.refresh');

        // For ACP, we need to wait for the connection to be ready before sending the message
        // Store the initial message and let the conversation page handle it when ready
        const initialMessage = {
          input,
          files: files.length > 0 ? files : undefined,
        };

        // Store initial message in sessionStorage to be picked up by the conversation page
        sessionStorage.setItem(`acp_initial_message_${conversation.id}`, JSON.stringify(initialMessage));

        // 鐒跺悗瀵艰埅鍒颁細璇濋〉闈?
        await navigate(`/conversation/${conversation.id}`);
      } catch (error: unknown) {
        // 闈欓粯澶勭悊閿欒锛岃浼氳瘽闈㈡澘鐨?AgentSetupCard 鏉ュ鐞嗗彲鐢ㄦ€ф鏌ュ拰鑷姩鍒囨崲
        // Silently handle errors, let conversation panel's AgentSetupCard handle availability check and auto-switch
        console.error('Failed to create ACP conversation:', error);
        throw error; // Re-throw to prevent input clearing
      }
    }
  };
  const sendMessageHandler = () => {
    setLoading(true);
    handleSend()
      .then(() => {
        // Clear all input states on successful send
        setInput('');
        setMentionOpen(false);
        setMentionQuery(null);
        setMentionSelectorOpen(false);
        setMentionActiveIndex(0);
        setFiles([]);
        setDir('');
      })
      .catch((error) => {
        console.error('Failed to send message:', error);
        // Keep the input content when there's an error
      })
      .finally(() => {
        setLoading(false);
      });
  };
  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (isComposing.current) return;
      if ((mentionOpen || mentionSelectorOpen) && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault();
        if (filteredMentionOptions.length === 0) return;
        setMentionActiveIndex((prev) => {
          if (event.key === 'ArrowDown') {
            return (prev + 1) % filteredMentionOptions.length;
          }
          return (prev - 1 + filteredMentionOptions.length) % filteredMentionOptions.length;
        });
        return;
      }
      if ((mentionOpen || mentionSelectorOpen) && event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (filteredMentionOptions.length > 0) {
          const query = mentionQuery?.toLowerCase();
          const exactMatch = query ? filteredMentionOptions.find((option) => option.label.toLowerCase() === query || option.tokens.has(query)) : undefined;
          const selected = exactMatch || filteredMentionOptions[mentionActiveIndex] || filteredMentionOptions[0];
          if (selected) {
            selectMentionAgent(selected.key);
            return;
          }
        }
        setMentionOpen(false);
        setMentionQuery(null);
        setMentionSelectorOpen(false);
        setMentionActiveIndex(0);
        return;
      }
      if (mentionOpen && (event.key === 'Backspace' || event.key === 'Delete') && !mentionQuery) {
        setMentionOpen(false);
        setMentionQuery(null);
        setMentionActiveIndex(0);
        return;
      }
      if (!mentionOpen && mentionSelectorVisible && !input.trim() && (event.key === 'Backspace' || event.key === 'Delete')) {
        event.preventDefault();
        setMentionSelectorVisible(false);
        setMentionSelectorOpen(false);
        setMentionActiveIndex(0);
        return;
      }
      if ((mentionOpen || mentionSelectorOpen) && event.key === 'Escape') {
        event.preventDefault();
        setMentionOpen(false);
        setMentionQuery(null);
        setMentionSelectorOpen(false);
        setMentionActiveIndex(0);
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (!input.trim()) return;
        sendMessageHandler();
      }
    },
    [filteredMentionOptions, mentionOpen, mentionQuery, mentionSelectorOpen, selectMentionAgent, sendMessageHandler, mentionActiveIndex, mentionSelectorVisible, input, isComposing]
  );
  const setDefaultModel = async () => {
    if (!modelList || modelList.length === 0) {
      return;
    }
    const currentKey = selectedModelKeyRef.current || buildModelKey(currentModel?.id, currentModel?.useModel);
    // 褰撳墠閫夋嫨浠嶇劧鍙敤鍒欎笉閲嶇疆 / Keep current selection when still available
    if (isModelKeyAvailable(currentKey, modelList)) {
      if (!selectedModelKeyRef.current && currentKey) {
        selectedModelKeyRef.current = currentKey;
      }
      return;
    }
    // 璇诲彇榛樿閰嶇疆锛屾垨鍥炶惤鍒版柊鐨勭涓€涓ā鍨?    // Read default config, or fallback to first model
    const savedModel = (await ConfigStorage.get('guid.defaultModel')) ?? (await ConfigStorage.get('gemini.defaultModel'));

    // Handle backward compatibility: old format is string, new format is { id, useModel }
    const isNewFormat = savedModel && typeof savedModel === 'object' && 'id' in savedModel;

    let defaultModel: IProvider | undefined;
    let resolvedUseModel: string;

    if (isNewFormat) {
      // New format: find by provider ID first, then verify model exists
      const { id, useModel } = savedModel;
      const exactMatch = modelList.find((m) => m.id === id);
      if (exactMatch && exactMatch.model.includes(useModel)) {
        defaultModel = exactMatch;
        resolvedUseModel = useModel;
      } else {
        // Provider deleted or model removed, fallback
        defaultModel = modelList[0];
        resolvedUseModel = defaultModel?.model[0] ?? '';
      }
    } else if (typeof savedModel === 'string') {
      // Old format: fallback to model name matching (backward compatibility)
      defaultModel = modelList.find((m) => m.model.includes(savedModel)) || modelList[0];
      resolvedUseModel = defaultModel?.model.includes(savedModel) ? savedModel : (defaultModel?.model[0] ?? '');
    } else {
      // No saved model, use first one
      defaultModel = modelList[0];
      resolvedUseModel = defaultModel?.model[0] ?? '';
    }

    if (!defaultModel || !resolvedUseModel) return;

    await setCurrentModel({
      ...defaultModel,
      useModel: resolvedUseModel,
    });
  };
  useEffect(() => {
    setDefaultModel().catch((error) => {
      console.error('Failed to set default model:', error);
    });
  }, [modelList]);

  // 鎵撳瓧鏈烘晥鏋?/ Typewriter effect
  useEffect(() => {
    const fullText = t('conversation.welcome.placeholder');
    let currentIndex = 0;
    const typingSpeed = 80; // 姣忎釜瀛楃鐨勬墦瀛楅€熷害锛堟绉掞級/ Typing speed per character (ms)
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const typeNextChar = () => {
      if (currentIndex <= fullText.length) {
        // 鍦ㄦ墦瀛楄繃绋嬩腑娣诲姞鍏夋爣 / Add cursor during typing
        setTypewriterPlaceholder(fullText.slice(0, currentIndex) + (currentIndex < fullText.length ? '|' : ''));
        currentIndex++;
      }
    };

    // 鍒濆寤惰繜锛岃鐢ㄦ埛鐪嬪埌椤甸潰鍔犺浇瀹屾垚 / Initial delay to let user see page loaded
    const initialDelay = setTimeout(() => {
      intervalId = setInterval(() => {
        typeNextChar();
        if (currentIndex > fullText.length) {
          if (intervalId) clearInterval(intervalId);
          setIsTyping(false); // 鎵撳瓧瀹屾垚 / Typing complete
          setTypewriterPlaceholder(fullText); // 绉婚櫎鍏夋爣 / Remove cursor
        }
      }, typingSpeed);
    }, 300);

    // 娓呯悊鍑芥暟锛氬悓鏃舵竻鐞?timeout 鍜?interval / Cleanup: clear both timeout and interval
    return () => {
      clearTimeout(initialDelay);
      if (intervalId) clearInterval(intervalId);
    };
  }, [t]);
  return (
    <ConfigProvider getPopupContainer={() => guidContainerRef.current || document.body}>
      <div ref={guidContainerRef} className={styles.guidContainer}>
        <div className={styles.guidLayout}>
          <p className={`text-2xl font-semibold mb-8 text-0 text-center`}>{t('conversation.welcome.title')}</p>

          {/* Agent 閫夋嫨鍣?- 鍦ㄦ爣棰樹笅鏂?*/}
          {availableAgents && availableAgents.length > 0 && (
            <div className='w-full flex justify-center'>
              <div
                className='inline-flex items-center bg-fill-2'
                style={{
                  marginBottom: 16,
                  padding: '4px',
                  borderRadius: '30px',
                  transition: 'all 0.6s cubic-bezier(0.2, 0.8, 0.3, 1)',
                  width: 'fit-content',
                  gap: 0,
                  color: 'var(--text-primary)',
                }}
              >
                {availableAgents
                  .filter((agent) => agent.backend !== 'custom')
                  .map((agent, index) => {
                    const isSelected = selectedAgentKey === getAgentKey(agent);
                    const logoSrc = AGENT_LOGO_MAP[agent.backend];

                    return (
                      <React.Fragment key={getAgentKey(agent)}>
                        {index > 0 && <div className='text-16px lh-1 p-2px select-none opacity-30'>|</div>}
                        <div
                          className={`group flex items-center cursor-pointer whitespace-nowrap overflow-hidden ${isSelected ? 'opacity-100 px-12px py-8px rd-20px mx-2px' : 'opacity-60 p-4px hover:opacity-100'}`}
                          style={
                            isSelected
                              ? {
                                  transition: 'opacity 0.5s cubic-bezier(0.2, 0.8, 0.3, 1)',
                                  backgroundColor: 'var(--fill-0)',
                                }
                              : { transition: 'opacity 0.5s cubic-bezier(0.2, 0.8, 0.3, 1)' }
                          }
                          onClick={() => {
                            setSelectedAgentKey(getAgentKey(agent));
                            setMentionOpen(false);
                            setMentionQuery(null);
                            setMentionSelectorOpen(false);
                            setMentionActiveIndex(0);
                          }}
                        >
                          {logoSrc ? <img src={logoSrc} alt={`${agent.backend} logo`} width={20} height={20} style={{ objectFit: 'contain', flexShrink: 0 }} /> : <Robot theme='outline' size={20} fill='currentColor' style={{ flexShrink: 0 }} />}
                          <span
                            className={`font-medium text-14px ${isSelected ? 'font-semibold ml-4px' : 'max-w-0 opacity-0 overflow-hidden group-hover:max-w-100px group-hover:opacity-100 group-hover:ml-8px'}`}
                            style={{
                              color: 'var(--text-primary)',
                              transition: isSelected ? 'color 0.5s cubic-bezier(0.2, 0.8, 0.3, 1), font-weight 0.5s cubic-bezier(0.2, 0.8, 0.3, 1)' : 'max-width 0.6s cubic-bezier(0.2, 0.8, 0.3, 1), opacity 0.5s cubic-bezier(0.2, 0.8, 0.3, 1) 0.05s, margin 0.6s cubic-bezier(0.2, 0.8, 0.3, 1)',
                            }}
                          >
                            {agent.name}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}
              </div>
            </div>
          )}

          <div
            className={`${styles.guidInputCard} relative p-16px border-3 b bg-dialog-fill-0 b-solid rd-20px flex flex-col ${mentionOpen ? 'overflow-visible' : 'overflow-hidden'} transition-all duration-200 ${isFileDragging ? 'border-dashed' : ''}`}
            style={{
              zIndex: 1,
              transition: 'box-shadow 0.25s ease, border-color 0.25s ease, border-width 0.25s ease',
              ...(isFileDragging
                ? {
                    backgroundColor: 'var(--color-primary-light-1)',
                    borderColor: 'rgb(var(--primary-3))',
                    borderWidth: '1px',
                  }
                : {
                    borderWidth: '1px',
                    borderColor: isInputActive ? activeBorderColor : inactiveBorderColor,
                    boxShadow: isInputActive ? activeShadow : 'none',
                  }),
            }}
            {...dragHandlers}
          >
            {mentionSelectorVisible && (
              <div className='flex items-center gap-8px mb-8px'>
                <Dropdown
                  trigger='click'
                  popupVisible={mentionSelectorOpen}
                  onVisibleChange={(visible) => {
                    setMentionSelectorOpen(visible);
                    if (visible) {
                      setMentionQuery(null);
                    }
                  }}
                  droplist={mentionMenu}
                >
                  <div className='flex items-center gap-6px bg-fill-2 px-10px py-4px rd-16px cursor-pointer select-none'>
                    <span className='text-14px font-medium text-t-primary'>@{selectedAgentLabel}</span>
                    <Down theme='outline' size={12} />
                  </div>
                </Dropdown>
              </div>
            )}
            <Input.TextArea autoSize={{ minRows: 3, maxRows: 20 }} placeholder={typewriterPlaceholder || t('conversation.welcome.placeholder')} className={`text-16px focus:b-none rounded-xl !bg-transparent !b-none !resize-none !p-0 ${styles.lightPlaceholder}`} value={input} onChange={handleInputChange} onPaste={onPaste} onFocus={handleTextareaFocus} onBlur={handleTextareaBlur} {...compositionHandlers} onKeyDown={handleInputKeyDown}></Input.TextArea>
            {mentionOpen && (
              <div className='absolute z-50' style={{ left: 16, top: 44 }}>
                {mentionMenu}
              </div>
            )}
            {files.length > 0 && (
              // 灞曠ず寰呭彂閫佺殑鏂囦欢骞跺厑璁稿彇娑?/ Show pending files and allow cancellation
              <div className='flex flex-wrap items-center gap-8px mt-12px mb-12px'>
                {files.map((path) => (
                  <FilePreview key={path} path={path} onRemove={() => handleRemoveFile(path)} />
                ))}
              </div>
            )}
            <div className={styles.actionRow}>
              <div className={styles.actionTools}>
                <Dropdown
                  trigger='hover'
                  onVisibleChange={setIsPlusDropdownOpen}
                  droplist={
                    <Menu
                      className='min-w-200px'
                      onClickMenuItem={(key) => {
                        if (key === 'file') {
                          ipcBridge.dialog.showOpen
                            .invoke({ properties: ['openFile', 'multiSelections'] })
                            .then((uploadedFiles) => {
                              if (uploadedFiles && uploadedFiles.length > 0) {
                                // 閫氳繃瀵硅瘽妗嗕笂浼犵殑鏂囦欢浣跨敤杩藉姞妯″紡
                                // Files uploaded via dialog use append mode
                                handleFilesUploaded(uploadedFiles);
                              }
                            })
                            .catch((error) => {
                              console.error('Failed to open file dialog:', error);
                            });
                        } else if (key === 'workspace') {
                          ipcBridge.dialog.showOpen
                            .invoke({ properties: ['openDirectory'] })
                            .then((files) => {
                              if (files && files[0]) {
                                setDir(files[0]);
                              }
                            })
                            .catch((error) => {
                              console.error('Failed to open directory dialog:', error);
                            });
                        }
                      }}
                    >
                      <Menu.Item key='file'>
                        <div className='flex items-center gap-8px'>
                          <UploadOne theme='outline' size='16' fill={iconColors.secondary} style={{ lineHeight: 0 }} />
                          <span>{t('conversation.welcome.uploadFile')}</span>
                        </div>
                      </Menu.Item>
                      <Menu.Item key='workspace'>
                        <div className='flex items-center gap-8px'>
                          <FolderOpen theme='outline' size='16' fill={iconColors.secondary} style={{ lineHeight: 0 }} />
                          <span>{t('conversation.welcome.specifyWorkspace')}</span>
                        </div>
                      </Menu.Item>
                    </Menu>
                  }
                >
                  <span className='flex items-center gap-4px cursor-pointer lh-[1]'>
                    <Button type='text' shape='circle' className={isPlusDropdownOpen ? styles.plusButtonRotate : ''} icon={<Plus theme='outline' size='14' strokeWidth={2} fill={iconColors.primary} />}></Button>
                    {files.length > 0 && (
                      <Tooltip className={'!max-w-max'} content={<span className='whitespace-break-spaces'>{getCleanFileNames(files).join('\n')}</span>}>
                        <span className='text-t-primary'>File({files.length})</span>
                      </Tooltip>
                    )}
                  </span>
                </Dropdown>

                <Dropdown
                  trigger='hover'
                  droplist={
                    <Menu selectedKeys={currentModel ? [currentModel.id + currentModel.useModel] : []}>
                      {!modelList || modelList.length === 0
                        ? [
                            <Menu.Item key='no-models' className='px-12px py-12px text-t-secondary text-14px text-center flex justify-center items-center' disabled>
                              {t('settings.noAvailableModels')}
                            </Menu.Item>,
                            <Menu.Item key='add-model' className='text-12px text-t-secondary' onClick={() => navigate('/settings/model')}>
                              <Plus theme='outline' size='12' />
                              {t('settings.addModel')}
                            </Menu.Item>,
                          ]
                        : [
                            ...(modelList || []).map((provider) => {
                              const availableModels = getAvailableModels(provider);
                              if (availableModels.length === 0) return null;
                              return (
                                <Menu.ItemGroup title={provider.name} key={provider.id}>
                                  {availableModels.map((modelName) => (
                                    <Menu.Item
                                      key={provider.id + modelName}
                                      className={currentModel?.id + currentModel?.useModel === provider.id + modelName ? '!bg-2' : ''}
                                      onClick={() => {
                                        setCurrentModel({ ...provider, useModel: modelName }).catch((error) => {
                                          console.error('Failed to set current model:', error);
                                        });
                                      }}
                                    >
                                      {modelName}
                                    </Menu.Item>
                                  ))}
                                </Menu.ItemGroup>
                              );
                            }),
                            <Menu.Item key='add-model' className='text-12px text-t-secondary' onClick={() => navigate('/settings/model')}>
                              <Plus theme='outline' size='12' />
                              {t('settings.addModel')}
                            </Menu.Item>,
                          ]}
                    </Menu>
                  }
                >
                  <Button className={'sendbox-model-btn'} shape='round'>
                    {currentModel ? currentModel.useModel : t('conversation.welcome.selectModel')}
                  </Button>
                </Dropdown>

                {supportsModeSwitch(selectedAgent) && <AgentModeSelector backend={selectedAgent} compact initialMode={selectedMode} onModeSelect={(mode) => setSelectedMode(mode)} />}

                {isPresetAgent && selectedAgentInfo && (
                  <div
                    className={styles.presetAgentTag}
                    onClick={() => {
                      /* Optional: Open assistant settings or do nothing, removal is via the X icon */
                    }}
                  >
                    {(() => {
                      const avatarValue = selectedAgentInfo.avatar?.trim();
                      const avatarImage = avatarValue ? CUSTOM_AVATAR_IMAGE_MAP[avatarValue] : undefined;
                      return avatarImage ? <img src={avatarImage} alt='' width={16} height={16} style={{ objectFit: 'contain', flexShrink: 0 }} /> : avatarValue ? <span style={{ fontSize: 14, lineHeight: '16px', flexShrink: 0 }}>{avatarValue}</span> : <Robot theme='outline' size={16} style={{ flexShrink: 0 }} />;
                    })()}
                    {(() => {
                      const agent = customAgents.find((a) => a.id === selectedAgentInfo.customAgentId);
                      const name = agent?.nameI18n?.[localeKey] || agent?.name || selectedAgentInfo.name;
                      return <span className={styles.presetAgentTagName}>{name}</span>;
                    })()}
                    <div
                      className={styles.presetAgentTagClose}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAgentKey('codex'); // Reset to default
                      }}
                    >
                      <IconClose style={{ fontSize: 12, color: 'var(--color-text-3)' }} />
                    </div>
                  </div>
                )}
              </div>
              <div className={styles.actionSubmit}>
                <Button
                  shape='circle'
                  type='primary'
                  loading={loading}
                  disabled={!input.trim() || !currentModel}
                  icon={<ArrowUp theme='outline' size='14' fill='white' strokeWidth={2} />}
                  onClick={() => {
                    handleSend().catch((error) => {
                      console.error('Failed to send message:', error);
                    });
                  }}
                />
              </div>
            </div>
            {dir && (
              <div className='flex items-center justify-between gap-6px h-28px mt-12px px-12px text-13px text-t-secondary ' style={{ borderTop: '1px solid var(--border-base)' }}>
                <div className='flex items-center'>
                  <FolderOpen className='m-r-8px flex-shrink-0' theme='outline' size='16' fill={iconColors.secondary} style={{ lineHeight: 0 }} />
                  <Tooltip content={dir} position='top'>
                    <span className='truncate'>
                      {t('conversation.welcome.currentWorkspace')}: {dir}
                    </span>
                  </Tooltip>
                </div>
                <Tooltip content={t('conversation.welcome.clearWorkspace')} position='top'>
                  <IconClose className='hover:text-[rgb(var(--danger-6))] hover:bg-3 transition-colors' strokeWidth={3} style={{ fontSize: 16 }} onClick={() => setDir('')} />
                </Tooltip>
              </div>
            )}
          </div>

          {/* Assistant Selection Area */}
          {customAgents && customAgents.some((a) => a.isPreset) && (
            <div className='mt-16px w-full'>
              {isPresetAgent && selectedAgentInfo ? (
                // Selected Assistant View
                <div className='flex flex-col w-full animate-fade-in'>
                  {/* Main Agent Fallback Notice / Main Agent 鍥為€€鎻愮ず */}
                  {currentEffectiveAgentInfo.isFallback && (
                    <div
                      className='mb-12px px-12px py-8px rd-8px text-12px flex items-center gap-8px'
                      style={{
                        background: 'rgb(var(--warning-1))',
                        border: '1px solid rgb(var(--warning-3))',
                        color: 'rgb(var(--warning-6))',
                      }}
                    >
                      <span>
                        {t('guid.agentFallbackNotice', {
                          original: currentEffectiveAgentInfo.originalType.charAt(0).toUpperCase() + currentEffectiveAgentInfo.originalType.slice(1),
                          fallback: currentEffectiveAgentInfo.agentType.charAt(0).toUpperCase() + currentEffectiveAgentInfo.agentType.slice(1),
                          defaultValue: `${currentEffectiveAgentInfo.originalType.charAt(0).toUpperCase() + currentEffectiveAgentInfo.originalType.slice(1)} is unavailable, using ${currentEffectiveAgentInfo.agentType.charAt(0).toUpperCase() + currentEffectiveAgentInfo.agentType.slice(1)} instead.`,
                        })}
                      </span>
                    </div>
                  )}
                  <div className='w-full'>
                    <div className='flex items-center justify-between py-8px cursor-pointer select-none' onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
                      <span className='text-13px text-[rgb(var(--primary-6))] opacity-80'>{t('settings.assistantDescription', { defaultValue: 'Assistant Description' })}</span>
                      <Down theme='outline' size={14} fill='rgb(var(--primary-6))' className={`transition-transform duration-300 ${isDescriptionExpanded ? 'rotate-180' : ''}`} />
                    </div>
                    <div className={`overflow-hidden transition-all duration-300 ${isDescriptionExpanded ? 'max-h-500px mt-4px opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div
                        className='p-12px rd-14px text-13px text-3 text-t-secondary whitespace-pre-wrap leading-relaxed '
                        style={{
                          border: '1px solid var(--color-border-2)',
                          background: 'var(--color-fill-1)',
                        }}
                      >
                        {customAgents.find((a) => a.id === selectedAgentInfo.customAgentId)?.descriptionI18n?.[localeKey] || customAgents.find((a) => a.id === selectedAgentInfo.customAgentId)?.description || t('settings.assistantDescriptionPlaceholder', { defaultValue: 'No description' })}
                      </div>
                    </div>
                  </div>

                  {/* Prompts Section */}
                  {(() => {
                    const agent = customAgents.find((a) => a.id === selectedAgentInfo.customAgentId);
                    const prompts = agent?.promptsI18n?.[localeKey] || agent?.promptsI18n?.['en-US'] || agent?.prompts;
                    if (prompts && prompts.length > 0) {
                      return (
                        <div className='flex flex-wrap gap-8px mt-16px'>
                          {prompts.map((prompt: string, index: number) => (
                            <div
                              key={index}
                              className='px-12px py-6px bg-fill-2 hover:bg-fill-3 text-[rgb(var(--primary-6))] text-13px rd-16px cursor-pointer transition-colors shadow-sm'
                              onClick={() => {
                                setInput(prompt);
                                handleTextareaFocus();
                              }}
                            >
                              {prompt}
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ) : (
                // Assistant List View
                <div className='flex flex-wrap gap-8px justify-center'>
                  {customAgents
                    .filter((a) => a.isPreset && a.enabled !== false)
                    .sort((a, b) => {
                      if (a.id === 'cowork') return -1;
                      if (b.id === 'cowork') return 1;
                      return 0;
                    })
                    .map((assistant) => {
                      const avatarValue = assistant.avatar?.trim();
                      const avatarImage = avatarValue ? CUSTOM_AVATAR_IMAGE_MAP[avatarValue] : undefined;
                      return (
                        <div
                          key={assistant.id}
                          className='h-28px group flex items-center gap-8px px-16px rd-100px cursor-pointer transition-all b-1 b-solid border-arco-2 hover:bg-fill-0 select-none'
                          onClick={() => {
                            setSelectedAgentKey(`custom:${assistant.id}`);
                            setMentionOpen(false);
                            setMentionQuery(null);
                            setMentionSelectorOpen(false);
                            setMentionActiveIndex(0);
                          }}
                        >
                          {avatarImage ? <img src={avatarImage} alt='' width={16} height={16} style={{ objectFit: 'contain' }} /> : avatarValue ? <span style={{ fontSize: 16, lineHeight: '18px' }}>{avatarValue}</span> : <Robot theme='outline' size={16} />}
                          <span className='text-14px text-4 hover:text-2'>{assistant.nameI18n?.[localeKey] || assistant.name}</span>
                        </div>
                      );
                    })}
                  <div className='h-28px flex items-center gap-8px px-16px rd-100px cursor-pointer transition-all text-t-secondary hover:text-t-primary hover:bg-fill-2 b-1 b-dashed b-aou-2 select-none' onClick={() => navigate('/settings/agent')}>
                    <Plus theme='outline' size={14} className='line-height-0' />
                    <span className='text-13px'>{t('settings.createAssistant', { defaultValue: 'Create' })}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 搴曢儴蹇嵎鎸夐挳 */}
        <div className='absolute bottom-32px left-50% -translate-x-1/2 flex flex-col justify-center items-center'>
          {/* <div className='text-text-3 text-14px mt-24px mb-12px'>{t('conversation.welcome.quickActionsTitle')}</div> */}
          <div className='flex justify-center items-center gap-24px'>
            <div className='group flex items-center justify-center w-36px h-36px rd-50% bg-fill-0 cursor-pointer overflow-hidden whitespace-nowrap hover:w-200px hover:rd-28px hover:px-20px hover:justify-start hover:gap-10px transition-all duration-400 ease-[cubic-bezier(0.2,0.8,0.3,1)]' style={quickActionStyle(hoveredQuickAction === 'feedback')} onMouseEnter={() => setHoveredQuickAction('feedback')} onMouseLeave={() => setHoveredQuickAction(null)} onClick={() => openLink('https://x.com/AionUi')}>
              <svg className='flex-shrink-0 text-[var(--color-text-3)] group-hover:text-[#2C7FFF] transition-colors duration-300' width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
                <path d='M6.58335 16.6674C8.17384 17.4832 10.0034 17.7042 11.7424 17.2905C13.4814 16.8768 15.0155 15.8555 16.0681 14.4108C17.1208 12.9661 17.6229 11.1929 17.4838 9.41082C17.3448 7.6287 16.5738 5.95483 15.3099 4.69085C14.0459 3.42687 12.372 2.6559 10.5899 2.51687C8.80776 2.37784 7.03458 2.8799 5.58987 3.93256C4.14516 4.98523 3.12393 6.51928 2.71021 8.25828C2.29648 9.99729 2.51747 11.8269 3.33335 13.4174L1.66669 18.334L6.58335 16.6674Z' stroke='currentColor' strokeWidth='1.66667' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
              <span className='opacity-0 max-w-0 overflow-hidden text-14px text-[var(--color-text-2)] font-bold group-hover:opacity-100 group-hover:max-w-250px transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.3,1)]'>{t('conversation.welcome.quickActionFeedback')}</span>
            </div>
            <div className='group flex items-center justify-center w-36px h-36px rd-50% bg-fill-0 cursor-pointer overflow-hidden whitespace-nowrap hover:w-200px hover:rd-28px hover:px-20px hover:justify-start hover:gap-10px transition-all duration-400 ease-[cubic-bezier(0.2,0.8,0.3,1)]' style={quickActionStyle(hoveredQuickAction === 'repo')} onMouseEnter={() => setHoveredQuickAction('repo')} onMouseLeave={() => setHoveredQuickAction(null)} onClick={() => openLink('https://github.com/iOfficeAI/AionUi')}>
              <svg className='flex-shrink-0 text-[var(--color-text-3)] group-hover:text-[#FE9900] transition-colors duration-300' width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
                <path
                  d='M9.60416 1.91176C9.64068 1.83798 9.6971 1.77587 9.76704 1.73245C9.83698 1.68903 9.91767 1.66602 9.99999 1.66602C10.0823 1.66602 10.163 1.68903 10.233 1.73245C10.3029 1.77587 10.3593 1.83798 10.3958 1.91176L12.3208 5.81093C12.4476 6.06757 12.6348 6.2896 12.8663 6.45797C13.0979 6.62634 13.3668 6.73602 13.65 6.77759L17.955 7.40759C18.0366 7.41941 18.1132 7.45382 18.1762 7.50693C18.2393 7.56003 18.2862 7.62972 18.3117 7.7081C18.3372 7.78648 18.3402 7.87043 18.3205 7.95046C18.3007 8.03048 18.259 8.10339 18.2 8.16093L15.0867 11.1926C14.8813 11.3927 14.7277 11.6397 14.639 11.9123C14.5503 12.1849 14.5292 12.475 14.5775 12.7576L15.3125 17.0409C15.3269 17.1225 15.3181 17.2064 15.2871 17.2832C15.2561 17.3599 15.2041 17.4264 15.1371 17.4751C15.0701 17.5237 14.9908 17.5526 14.9082 17.5583C14.8256 17.5641 14.7431 17.5465 14.67 17.5076L10.8217 15.4843C10.5681 15.3511 10.286 15.2816 9.99958 15.2816C9.71318 15.2816 9.43106 15.3511 9.17749 15.4843L5.32999 17.5076C5.25694 17.5463 5.17449 17.5637 5.09204 17.5578C5.00958 17.5519 4.93043 17.5231 4.86357 17.4744C4.79672 17.4258 4.74485 17.3594 4.71387 17.2828C4.68289 17.2061 4.67404 17.1223 4.68833 17.0409L5.42249 12.7584C5.47099 12.4757 5.44998 12.1854 5.36128 11.9126C5.27257 11.6398 5.11883 11.3927 4.91333 11.1926L1.79999 8.16176C1.74049 8.10429 1.69832 8.03126 1.6783 7.95099C1.65827 7.87072 1.66119 7.78644 1.68673 7.70775C1.71226 7.62906 1.75938 7.55913 1.82272 7.50591C1.88607 7.4527 1.96308 7.41834 2.04499 7.40676L6.34916 6.77759C6.63271 6.73634 6.90199 6.62681 7.13381 6.45842C7.36564 6.29002 7.55308 6.06782 7.67999 5.81093L9.60416 1.91176Z'
                  stroke='currentColor'
                  strokeWidth='1.66667'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
              <span className='opacity-0 max-w-0 overflow-hidden text-14px text-[var(--color-text-2)] font-bold group-hover:opacity-100 group-hover:max-w-250px transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.3,1)]'>{t('conversation.welcome.quickActionStar')}</span>
            </div>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default Guid;
