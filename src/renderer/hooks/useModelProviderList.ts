import { ipcBridge } from '@/common';
import type { IProvider } from '@/common/storage';
import { useCallback, useMemo, useRef } from 'react';
import useSWR from 'swr';
import { hasSpecificModelCapability } from '@/renderer/utils/modelCapabilities';

export interface ModelProviderListResult {
  providers: IProvider[];
  geminiModeLookup: Map<string, never>;
  getAvailableModels: (provider: IProvider) => string[];
  formatModelLabel: (provider: { platform?: string } | undefined, modelName?: string) => string;
}

/**
 * Shared hook that builds the provider list and exposes helper methods.
 */
export const useModelProviderList = (): ModelProviderListResult => {
  const geminiModeLookup = useMemo(() => new Map<string, never>(), []);

  const { data: modelConfig } = useSWR('model.config.shared', () => ipcBridge.mode.getModelConfig.invoke());

  // Mutable cache for available-model filtering
  const availableModelsCacheRef = useRef(new Map<string, string[]>());

  const getAvailableModels = useCallback((provider: IProvider): string[] => {
    const cacheKey = `${provider.id}-${(provider.model || []).join(',')}`;
    const cache = availableModelsCacheRef.current;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!;
    }
    const result: string[] = [];
    for (const modelName of provider.model || []) {
      const functionCalling = hasSpecificModelCapability(provider, modelName, 'function_calling');
      const excluded = hasSpecificModelCapability(provider, modelName, 'excludeFromPrimary');
      if ((functionCalling === true || functionCalling === undefined) && excluded !== true) {
        result.push(modelName);
      }
    }
    cache.set(cacheKey, result);
    return result;
  }, []);

  const providers = useMemo(() => {
    const list: IProvider[] = Array.isArray(modelConfig) ? modelConfig : [];
    return list.filter((p) => getAvailableModels(p).length > 0);
  }, [getAvailableModels, modelConfig]);

  const formatModelLabel = useCallback((_provider: { platform?: string } | undefined, modelName?: string) => {
    return modelName || '';
  }, []);

  return { providers, geminiModeLookup, getAvailableModels, formatModelLabel };
};
