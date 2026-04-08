import axios from 'axios';
import { AbstractIngressPlugin } from '../AbstractIngressPlugin';
import { Config } from '../types/Config';
import { PositionalObject } from '../types/PositionalObject';
import logger from '../logger';

export default class GpsAuge extends AbstractIngressPlugin {
  private username = '';
  private password = '';
  private interval: NodeJS.Timeout | null = null;

  constructor() {
    super('gpsauge');
    logger.info('GpsAuge plugin initialized');
  }

  setConfig(config: Config) {
    try {
      this.username = config.plugins.ingress[this.name].username;
      this.password = config.plugins.ingress[this.name].password;
    } catch (error) {
      logger.error('Error setting config for plugin %s', this.name, error);
    }
  }

  start(): void {
    logger.info('GpsAuge plugin started');
    void this.singleRun();

    this.interval = setInterval(() => {
      void this.singleRun();
    }, 30 * 1000); // Run every 30 seconds
  }

  stop(): void {
    logger.info('GpsAuge plugin stopped');
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async singleRun() {
    const deviceMapping: Record<number, string> = {};
    const response = (await this.fetchAvailableData()) as { id: number }[];
    //logger.info('Fetched data: %o', response);

    const devices = this.globalDevicesCallback ? this.globalDevicesCallback() : [];
    for (const item of response) {
      for (const device of devices) {
        if (device.ingress[this.name].id === item.id.toString()) {
          deviceMapping[item.id] = device.id;
        }
      }
    }

    for (const item of response) {
      const unitId = deviceMapping[item.id];
      const gpsAugeId = item.id;
      if (unitId) {
        this.fetchEnityPosition(gpsAugeId)
          .then((positionDataRaw: unknown) => {
            const positionData = positionDataRaw as { lat?: number; lon?: number };
            if (positionData.lat === undefined || positionData.lon === undefined) {
              logger.error('Invalid position data for unit %s: %o', unitId, positionData);
              return;
            }

            const { lat, lon } = this.convertToDecimalDegrees(positionData.lat, positionData.lon);
            const newPosition: PositionalObject = {
              id: unitId,
              position: {
                latitude: lat,
                longitude: lon,
                accuracy: 0,
                altitude: 0,
                timestamp: new Date().toISOString(),
              },
            };
            this.emit('newData', newPosition);
          })
          .catch((error) => {
            logger.error('Error fetching position for unit %s: %o', unitId, error);
          });
      }
    }
  }

  convertToDecimalDegrees(lat: number, lon: number): { lat: number; lon: number } {
    const latDegrees = Math.floor(lat / 100);
    const latMinutes = lat - latDegrees * 100;
    const lonDegrees = Math.floor(lon / 100);
    const lonMinutes = lon - lonDegrees * 100;

    return {
      lat: latDegrees + latMinutes / 60,
      lon: lonDegrees + lonMinutes / 60,
    };
  }

  async fetchEnityPosition(gpsAugeId: number): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const now = new Date();
      const timestamp = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const data = new FormData();
      data.append('module', 'devices');
      data.append('action', 'getonepos');
      data.append('user', this.username);
      data.append('pwd', this.password);
      data.append('format', 'json');
      data.append('ts', timestamp);
      data.append('deviceid', gpsAugeId.toString());

      axios
        .post('https://www.apioverip.de/', data)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error: Error) => {
          reject(error);
        });
    });
  }
  async fetchAvailableData(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const data = new FormData();
      data.append('module', 'devices');
      data.append('action', 'list');
      data.append('mode', 'cars');
      data.append('user', this.username);
      data.append('pwd', this.password);
      data.append('product', 'GPSauge+InOne+V4+%282010%29');
      data.append('nozlib', '1');
      data.append('format', 'json');

      axios
        .post('https://www.apioverip.de/', data)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error: Error) => {
          reject(error);
        });
    });
  }
}
