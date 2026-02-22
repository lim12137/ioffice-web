/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventEmitter } from 'events';
import type { Serializable } from 'child_process';
import { fork } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

export type OpenDialogOptions = {
  defaultPath?: string;
  properties?: string[];
};

export type MenuItemConstructorOptions = {
  label?: string;
  click?: () => void;
  type?: string;
  role?: string;
  accelerator?: string;
  submenu?: MenuItemConstructorOptions[];
  enabled?: boolean;
  checked?: boolean;
};

export type NativeImage = {
  isEmpty: () => boolean;
};

const parseCommandLineSwitch = (flag: string): string | undefined => {
  const prefix = `--${flag}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }

  const idx = process.argv.indexOf(`--${flag}`);
  if (idx >= 0) {
    const next = process.argv[idx + 1];
    if (next && !next.startsWith('--')) {
      return next;
    }
    return '';
  }

  return undefined;
};

const resolveUserDataPath = (): string => {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA;
    if (appData) {
      return path.join(appData, 'AionUi');
    }
  }

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'AionUi');
  }

  return path.join(os.homedir(), '.config', 'AionUi');
};

class CommandLineShim {
  private readonly switches = new Map<string, string>();

  appendSwitch(flag: string, value = ''): void {
    this.switches.set(flag, value);
  }

  hasSwitch(flag: string): boolean {
    return this.switches.has(flag) || process.argv.includes(`--${flag}`) || parseCommandLineSwitch(flag) !== undefined;
  }

  getSwitchValue(flag: string): string {
    if (this.switches.has(flag)) {
      return this.switches.get(flag) ?? '';
    }
    return parseCommandLineSwitch(flag) ?? '';
  }
}

class AppShim extends EventEmitter {
  readonly name = 'AionUi';
  readonly isPackaged = process.env.NODE_ENV === 'production';
  readonly commandLine = new CommandLineShim();
  readonly dock: { setIcon: (_icon: NativeImage) => void } = {
    setIcon: (_icon: NativeImage): void => undefined,
  };
  private ready = true;

  async whenReady(): Promise<void> {
    this.ready = true;
    return Promise.resolve();
  }

  isReady(): boolean {
    return this.ready;
  }

  quit(): void {
    this.emit('before-quit');
    process.exit(0);
  }

  exit(code = 0): void {
    this.emit('before-quit');
    process.exit(code);
  }

  relaunch(): void {
    // no-op in web-only runtime
  }

  getVersion(): string {
    try {
      const pkgRaw = fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8');
      const pkg = JSON.parse(pkgRaw) as { version?: string };
      return pkg.version ?? '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  getName(): string {
    return this.name;
  }

  getPath(name: string): string {
    switch (name) {
      case 'temp':
        return os.tmpdir();
      case 'home':
        return os.homedir();
      case 'downloads':
        return path.join(os.homedir(), 'Downloads');
      case 'userData':
        return resolveUserDataPath();
      default:
        return process.cwd();
    }
  }

  getAppPath(): string {
    return process.cwd();
  }
}

const app = new AppShim();

type IpcHandler = (_event: unknown, ...args: unknown[]) => unknown;

class IpcMainShim {
  private readonly handlers = new Map<string, IpcHandler>();

  handle(channel: string, listener: IpcHandler): void {
    this.handlers.set(channel, listener);
  }

  removeHandler(channel: string): void {
    this.handlers.delete(channel);
  }

  async invoke(channel: string, ...args: unknown[]): Promise<unknown> {
    const handler = this.handlers.get(channel);
    if (!handler) {
      throw new Error(`No ipcMain handler registered for channel: ${channel}`);
    }
    return Promise.resolve(handler({}, ...args));
  }
}

const ipcMain = new IpcMainShim();

type IpcRendererShim = {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  on: (_channel: string, _listener: (...args: unknown[]) => void) => void;
  off: (_channel: string, _listener: (...args: unknown[]) => void) => void;
};

const ipcRenderer: IpcRendererShim = {
  invoke: async (channel: string, ...args: unknown[]) => ipcMain.invoke(channel, ...args),
  on: (_channel: string, _listener: (...args: unknown[]) => void): void => undefined,
  off: (_channel: string, _listener: (...args: unknown[]) => void): void => undefined,
};

const contextBridge = {
  exposeInMainWorld: (key: string, api: unknown) => {
    const target = globalThis as Record<string, unknown>;
    target[key] = api;
  },
};

const webUtils = {
  getPathForFile: (_file: File) => '',
};

class WebContentsShim extends EventEmitter {
  private zoomFactor = 1;

  constructor() {
    super();
  }

  openDevTools(): void {
    // no-op in web-only runtime
  }

  setZoomFactor(factor: number): void {
    this.zoomFactor = factor;
  }

  getZoomFactor(): number {
    return this.zoomFactor;
  }

  async printToPDF(_options?: Record<string, unknown>): Promise<Buffer> {
    return Buffer.alloc(0);
  }

  send(_channel: string, ..._args: unknown[]): void {
    // no-op
  }
}

export class BrowserWindow extends EventEmitter {
  static windows: BrowserWindow[] = [];

  readonly webContents = new WebContentsShim();

  constructor(_options?: Record<string, unknown>) {
    super();
    BrowserWindow.windows.push(this);
  }

  static getAllWindows(): BrowserWindow[] {
    return [...BrowserWindow.windows];
  }

  static getFocusedWindow(): BrowserWindow | null {
    return BrowserWindow.windows[0] ?? null;
  }

  async loadURL(_url: string): Promise<void> {
    return Promise.resolve();
  }

  close(): void {
    BrowserWindow.windows = BrowserWindow.windows.filter((win) => win !== this);
  }

  maximize(): void {
    // no-op
  }

  minimize(): void {
    // no-op
  }

  unmaximize(): void {
    // no-op
  }

  isMaximized(): boolean {
    return false;
  }
}

const nativeImage = {
  createFromPath: (iconPath: string): NativeImage => ({
    isEmpty: () => !iconPath || !fs.existsSync(iconPath),
  }),
};

const powerMonitor = new EventEmitter();

const screen = {
  getPrimaryDisplay: () => ({
    workAreaSize: {
      width: 1280,
      height: 800,
    },
  }),
};

const dialog = {
  async showOpenDialog(_browserWindowOrOptions?: BrowserWindow | OpenDialogOptions, _maybeOptions?: OpenDialogOptions): Promise<{ canceled: boolean; filePaths: string[] }> {
    return { canceled: true, filePaths: [] };
  },
};

const shell = {
  async openPath(_targetPath: string): Promise<string> {
    return '';
  },
  showItemInFolder(_targetPath: string): void {
    // no-op
  },
  async openExternal(_url: string): Promise<void> {
    return Promise.resolve();
  },
};

const powerSaveBlocker = {
  start: (_type: string): number => 1,
  stop: (_id: number): void => undefined,
  isStarted: (_id: number): boolean => false,
};

export type UtilityProcess = {
  pid: number;
  postMessage: (message: Serializable) => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  kill: () => void;
  stdout: NodeJS.ReadableStream | null;
  stderr: NodeJS.ReadableStream | null;
};

const utilityProcess = {
  fork: (modulePath: string, args: string[] = [], options: Record<string, unknown> = {}): UtilityProcess => {
    const child = fork(modulePath, args, {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      ...(options as Parameters<typeof fork>[2]),
    });

    return {
      pid: child.pid ?? 0,
      postMessage: (message: Serializable) => {
        child.send(message);
      },
      on: (event: string, listener: (...args: unknown[]) => void) => {
        child.on(event as 'message' | 'error' | 'exit', listener as (...args: any[]) => void);
      },
      kill: () => {
        child.kill();
      },
      stdout: child.stdout,
      stderr: child.stderr,
    };
  },
};

class MenuShim {
  static buildFromTemplate(_template: MenuItemConstructorOptions[]): MenuShim {
    return new MenuShim();
  }

  static setApplicationMenu(_menu: MenuShim | null): void {
    // no-op
  }
}

const Menu = MenuShim;

export { app, contextBridge, dialog, ipcMain, ipcRenderer, Menu, nativeImage, powerMonitor, powerSaveBlocker, screen, shell, utilityProcess, webUtils };
