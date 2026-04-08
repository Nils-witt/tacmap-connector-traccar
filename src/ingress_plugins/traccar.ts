import { AbstractIngressPlugin } from '../AbstractIngressPlugin';
import { Config } from '../types/Config';
import logger from '../logger';
import { PositionalObject } from '../types/PositionalObject';
import { WebSocket } from 'node:http';

export default class Traccar extends AbstractIngressPlugin {
  private url = '';
  private token = '';

  private socket: WebSocket | null = null;

  constructor() {
    super('traccar');
    logger.info('Traccar plugin initialized');
  }
  setConfig(config: Config) {
    try {
      logger.info('Plugin %s config: %o', this.name, config.plugins.ingress[this.name]);
      const pConf = config.plugins.ingress[this.name] as unknown as {
        url?: string;
        token?: string;
      };
      logger.info('Plugin %s config: %o', this.name, pConf);
      if (!pConf.url || !pConf.token) {
        logger.warn('Traccar plugin config is missing url or token');
      }
      this.url = pConf.url || '';
      this.token = pConf.token || '';
    } catch (error) {
      logger.error('Error setting config for plugin %s', this.name, error);
    }
  }

  start(): void {
    logger.info('Traccar plugin started');
    void this.startWebSocket();
  }

  stop(): void {
    logger.info('Traccar plugin stopped');
    this.socket?.close();
  }

  processMessage(data: string) {
    const deviceMapping: Record<string, string> = {};

    const devices = this.globalDevicesCallback ? this.globalDevicesCallback() : [];
    for (const device of devices) {
      if (device.ingress[this.name]) {
        deviceMapping[device.ingress[this.name].id] = device.id;
      }
    }

    const message = JSON.parse(data) as {
      positions?: {
        deviceId: string;
        latitude: number;
        longitude: number;
        altitude: number;
        accuracy: number;
        fixTime: string;
      }[];
    };

    if (message.positions) {
      const position = message.positions;
      logger.info('Received positions:');
      for (const pos of position) {
        logger.info(
          `Device ID: ${pos.deviceId}, Latitude: ${pos.latitude}, Longitude: ${pos.longitude}, Time: ${pos.fixTime}`,
        );
        if (deviceMapping[pos.deviceId]) {
          const newPosition: PositionalObject = {
            id: deviceMapping[pos.deviceId],
            position: {
              latitude: pos.latitude,
              longitude: pos.longitude,
              accuracy: pos.accuracy,
              altitude: 0,
              timestamp: new Date(pos.fixTime).toISOString(),
            },
          };
          this.emit('newData', newPosition);
        }
      }
    }
  }

  async startWebSocket() {
    if (!this.url || !this.token) {
      logger.warn('Cannot start WebSocket: url or token is missing');
      return;
    }

    const wsOptions: WebSocketInit = {
      headers: {
        Cookie: await this.getAuthCookie(),
      },
    };

    const ws = new WebSocket(`${this.url.replace(/^http/, 'ws')}/api/socket`, wsOptions);
    ws.onopen = () => {
      logger.info('WebSocket connection opened');
    };
    ws.onmessage = (event) => {
      this.processMessage(event.data as unknown as string);
    };
    ws.onerror = (error) => {
      logger.error('WebSocket error: %o', error);
    };

    ws.onclose = () => {
      logger.info('WebSocket connection closed');
    };
  }

  async getAuthCookie(): Promise<string> {
    const res = await fetch(`${this.url}/api/session?token=${this.token}`);
    let authCookie = '';
    res.headers.getSetCookie()?.forEach((cookie) => {
      authCookie = cookie.split(';')[0] || '';
    });
    return authCookie;
  }
}
