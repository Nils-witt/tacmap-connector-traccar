import { AbstractEgressPlugin } from '../AbstractEgressPlugin';
import { Config } from '../types/Config';
import { PositionalObject } from '../types/PositionalObject';
import logger from '../logger';

export default class TacmanEgressPlugin extends AbstractEgressPlugin {
  private url = '';
  private token = '';

  constructor() {
    super('tacman');
    logger.info('TacmanEgressPlugin initialized');
  }

  setConfig(config: Config) {
    try {
      const pConf = config.plugins.egress[this.name] as unknown as { url: string; token: string };
      logger.info('Plugin %s config: %o', this.name, pConf);
      this.url = pConf.url;
      this.token = pConf.token;
    } catch (error) {
      logger.error('Error setting config for plugin %s', this.name, error);
    }
  }

  sendData(id: string, data: PositionalObject): void {
    const { position } = data;
    this.sendToApi(
      id,
      position.latitude,
      position.longitude,
      position.altitude,
      position.accuracy,
    ).catch((error) => {
      logger.error('Error sending data to Tacman for unit %s: %o', id, error);
    });
  }

  async sendToApi(
    unitId: string,
    latitude: number,
    longitude: number,
    altitude: number,
    accuracy: number,
  ) {
    const callUrl = `${this.url}/units/${unitId}`;
    const options = {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        position: {
          latitude: latitude,
          longitude: longitude,
          altitude: altitude,
          accuracy: accuracy,
          timestamp: new Date().toISOString(),
        },
      }),
    };

    const res = await fetch(callUrl, options);
    logger.info(`Sent data to API for unit ${unitId}, response status: ${res.status}`);
  }
}
