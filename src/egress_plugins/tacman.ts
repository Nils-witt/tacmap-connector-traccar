import { AbstractEgressPlugin } from '../AbstractEgressPlugin';
import { Config } from '../types/Config';
import { PositionalObject } from '../types/PositionalObject';
import logger from '../logger';

export default class TacmanEgressPlugin extends AbstractEgressPlugin {
  private url = '';
  private token?: string;
  private username?: string;
  private password?: string;

  constructor() {
    super('tacman');
    logger.info('TacmanEgressPlugin initialized');
  }

  setConfig(config: Config) {
    try {
      const pConf = config.plugins.egress[this.name] as unknown as {
        url: string;
        token: string;
        username: string;
        password: string;
      };
      logger.info('Plugin %s config: %o', this.name, pConf);
      this.url = pConf.url;
      this.token = pConf.token;
      this.username = pConf.username;
      this.password = pConf.password;
      void this.getAuthToken();
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

  async getAuthToken(): Promise<string | undefined> {
    const payload = JSON.stringify({
      username: this.username,
      password: this.password,
    });

    console.log(payload);
    const callUrl = `${this.url}/token`;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
    };
    const res = await fetch(callUrl, options);
    if (!res.ok) {
      const errorText = await res.text();
      logger.error(
        'Failed to obtain auth token for Tacman, status: %s, response: %s',
        res.status,
        errorText,
      );
      return undefined;
    } else {
      const token = (await res.json()) as { token: string };
      logger.info('Successfully obtained auth token for Tacman');
      this.token = token.token;
    }
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
    if (!res.ok) {
      const errorText = await res.text();
      logger.error(
        'Failed to send data to Tacman for unit %s, status: %s, response: %s',
        unitId,
        res.status,
        errorText,
      );
      if (res.status === 401) {
        logger.info('Obtained new auth token for Tacman, retrying request');

        this.token = await this.getAuthToken();
        console.log('New token: %s', this.token);
        if (this.token) {
          logger.info('Retrying to send data to Tacman for unit %s', unitId);
          await this.sendToApi(unitId, latitude, longitude, altitude, accuracy);
        }
      }
    } else {
      logger.info('Successfully sent data to Tacman for unit %s, status: %s', unitId, res.status);
    }
  }
}
