/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import type { Configuration } from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { rendererConfig } from './webpack.renderer.config';

const webuiRendererConfig: Configuration = {
  ...rendererConfig,
  target: 'web',
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
    ...(rendererConfig.plugins ?? []),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, '../../public/index.html'),
      filename: 'main_window/index.html',
      chunks: ['main_window/index'],
      inject: 'body',
    }),
  ],
};

export default webuiRendererConfig;
