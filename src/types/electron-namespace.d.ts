declare namespace Electron {
  interface IpcMessageEvent extends Event {
    channel: string;
    args?: unknown[];
  }

  interface ConsoleMessageEvent extends Event {
    message: string;
  }

  interface WebviewTag extends HTMLElement {
    src: string;
    style: CSSStyleDeclaration;
    reload: () => void;
    executeJavaScript: (code: string) => Promise<unknown>;
    addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
    removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  }
}
