/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { fileURLToPath } from 'node:url';
import type { Configuration, RuleSetRule, RuleSetUseItem, WebpackPluginInstance } from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { rendererConfig } from './webpack.renderer.config.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const hasAssetRelocatorLoader = (use: RuleSetUseItem | RuleSetUseItem[] | undefined): boolean => {
  if (!use) return false;
  const useItems = Array.isArray(use) ? use : [use];
  return useItems.some((item) => {
    if (typeof item === 'string') {
      return item.includes('@vercel/webpack-asset-relocator-loader');
    }

    if (!item || typeof item === 'function') {
      return false;
    }

    if (typeof item === 'object' && 'loader' in item && typeof item.loader === 'string') {
      return item.loader.includes('@vercel/webpack-asset-relocator-loader');
    }

    return false;
  });
};

const filteredRules = (rendererConfig.module?.rules ?? []).filter((rule) => {
  if (!rule || typeof rule === 'string' || typeof rule === 'function' || Array.isArray(rule)) {
    return true;
  }
  return !hasAssetRelocatorLoader((rule as RuleSetRule).use);
});

const filteredPlugins = (rendererConfig.plugins ?? []).filter((plugin) => {
  const pluginName = (plugin as WebpackPluginInstance | undefined)?.constructor?.name;
  return pluginName !== 'ForkTsCheckerWebpackPlugin';
});

const webuiRendererConfig: Configuration = {
  ...rendererConfig,
  target: 'web',
  module: {
    ...(rendererConfig.module ?? {}),
    rules: filteredRules,
  },
  entry: {
    'main_window/index': path.resolve(__dirname, '../../src/renderer/index.ts'),
  },
  output: {
    path: path.resolve(__dirname, '../../.webpack/renderer'),
    filename: '[name].js',
    chunkFilename: '[name].js',
    publicPath: '/',
    clean: true,
  },
  plugins: [
    ...filteredPlugins,
    new HtmlWebpackPlugin({
      filename: 'main_window/index.html',
      chunks: ['main_window/index'],
      inject: 'body',
      templateContent: ({ htmlWebpackPlugin }) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${htmlWebpackPlugin.tags.headTags}
  </head>
  <body>
    <div id="root"></div>
    ${htmlWebpackPlugin.tags.bodyTags}
  </body>
</html>`,
    }),
  ],
};

export default webuiRendererConfig;
