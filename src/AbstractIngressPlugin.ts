import { Config } from './types/Config';
import { EntityConfig, PositionalObject } from './types/PositionalObject';
import logger from './logger';

export type IngressEvent = 'newData' | 'error';

export class AbstractIngressPlugin {
  private eventListeners: ((data: PositionalObject) => void)[] = [];
  public globalDevicesCallback?: () => EntityConfig[];
  public name: string;

  constructor(name?: string) {
    this.name = name || 'Unnamed Ingress Plugin';
    logger.info('IngressPlugin %s initialized', this.name);
  }

  setGlobalDevicesCallback(callback: () => EntityConfig[]) {
    this.globalDevicesCallback = callback;
  }

  on(listener: (data: PositionalObject) => void) {
    if (!this.eventListeners) {
      this.eventListeners = [];
    }
    this.eventListeners?.push(listener);
  }

  off(listener: (data: PositionalObject) => void) {
    this.eventListeners = this.eventListeners?.filter((l) => l !== listener);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setConfig(config: Config): void {
    // Default implementation - can be overridden by subclasses
  }

  protected emit(event: IngressEvent, data: PositionalObject) {
    this.eventListeners?.forEach((listener) => listener(data));
  }

  start(): void {
    // Default implementation - can be overridden by subclasses
  }

  stop(): void {
    // Default implementation - can be overridden by subclasses
  }
}
