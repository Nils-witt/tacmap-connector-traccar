import { Config } from './types/Config';
import logger from './logger';
import { PositionalObject } from './types/PositionalObject';

export class AbstractEgressPlugin {
  public name: string;

  constructor(name?: string) {
    this.name = name || 'Unnamed Egress Plugin';
    logger.info('EgressPlugin %s initialized', this.name);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setConfig(config: Config): void {
    // Default implementation - can be overridden by subclasses
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sendData(id: string, data: PositionalObject): void {
    // Default implementation - can be overridden by subclasses
  }
}
