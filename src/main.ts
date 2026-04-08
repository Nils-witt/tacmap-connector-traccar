import { AbstractIngressPlugin } from './AbstractIngressPlugin';
import { AbstractEgressPlugin } from './AbstractEgressPlugin';
import logger from './logger';
import fs from 'fs';
import path from 'path';
import { Config } from './types/Config';
import { EntityConfig, PositionalObject } from './types/PositionalObject';

class App {
  private ingestors = new Map<string, AbstractIngressPlugin>();
  private egressors = new Map<string, AbstractEgressPlugin>();
  private config: Config;

  private unitsConfig: Record<string, EntityConfig> = {};

  constructor() {
    const configRaw = fs.readFileSync('config.json', 'utf-8');
    this.config = JSON.parse(configRaw) as Config;

    for (const device of this.config.devices) {
      logger.info('Processing device %s %o', device.name, device);
      const newDeviceConfig: EntityConfig = {
        id: device.name,
        ingress: {},
        egress: {},
      };
      for (const [pluginName, pluginConfig] of Object.entries(device.ingress)) {
        newDeviceConfig.ingress[pluginName] = { id: pluginConfig.id };
      }
      logger.info('Device %s ingress config: %o', device.name, newDeviceConfig.ingress);
      for (const [pluginName, pluginConfig] of Object.entries(device.egress)) {
        newDeviceConfig.egress[pluginName] = { id: pluginConfig.id };
      }
      logger.info('Device %s egress config: %o', device.name, newDeviceConfig.egress);
      this.unitsConfig[device.name] = newDeviceConfig;
    }
  }

  private handleNewPosition(data: PositionalObject) {
    logger.info('Handling new position for unit %s: %o', data.id, data.position);
    const deviceConfig = this.unitsConfig[data.id];
    if (!deviceConfig) {
      logger.warn('Received position for unknown unit %s', data.id);
      return;
    }
    logger.info('Device config for unit %s: %o', data.id, deviceConfig);
    for (const [egressPluginName, egressConfig] of Object.entries(deviceConfig.egress)) {
      const egressPlugin = this.egressors.get(egressPluginName);

      console.log(
        'Egress plugin %s config for unit %s: %o',
        egressPluginName,
        data.id,
        egressConfig,
      );
      if (egressPlugin) {
        logger.info('Sending data to egress plugin %s for unit %s', egressPluginName, data.id);
        egressPlugin.sendData(egressConfig.id, data);
      } else {
        logger.warn('Egress plugin %s not found for unit %s', egressPluginName, data.id);
      }
    }
  }

  loadPlugins() {
    logger.info('Loading plugins...');
    fs.readdirSync(path.join(__dirname, 'ingress_plugins')).forEach((file) => {
      if (file.endsWith('.js') || file.endsWith('.ts')) {
        const pluginName = file.replace(/\.js$/, '').replace(/\.ts$/, '');
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const PluginClass = require(path.join(__dirname, 'ingress_plugins', pluginName))
            .default as typeof AbstractIngressPlugin; // eslint-disable-line @typescript-eslint/no-unsafe-member-access
          const pluginInstance: AbstractIngressPlugin = new PluginClass();
          pluginInstance.setConfig(this.config);
          pluginInstance.setGlobalDevicesCallback(() => Object.values(this.unitsConfig));
          pluginInstance.on((data) => this.handleNewPosition(data));
          this.ingestors.set(pluginInstance.name, pluginInstance);
        } catch (error) {
          logger.error('Error loading ingest plugin %s: %o', pluginName, error);
        }
      }
    });
    fs.readdirSync(path.join(__dirname, 'egress_plugins')).forEach((file) => {
      if (file.endsWith('.js') || file.endsWith('.ts')) {
        const pluginName = file.replace(/\.js$/, '').replace(/\.ts$/, '');
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const PluginClass = require(path.join(__dirname, 'egress_plugins', pluginName))
            .default as typeof AbstractEgressPlugin; // eslint-disable-line @typescript-eslint/no-unsafe-member-access
          const pluginInstance: AbstractEgressPlugin = new PluginClass();
          pluginInstance.setConfig(this.config);
          this.egressors.set(pluginInstance.name, pluginInstance);
        } catch (error) {
          logger.error('Error loading egress plugin %s: %o', pluginName, error);
        }
      }
    });
    logger.info(
      'Loaded %d ingest plugins and %d egress plugins.',
      this.ingestors.size,
      this.egressors.size,
    );
  }

  start() {
    logger.info('Starting ingress plugins...');
    this.ingestors.forEach((plugin) => plugin.start());
    logger.info('All ingress plugins started.');
  }
}

const app = new App();
app.loadPlugins();
app.start();

setInterval(() => {
  /* */
}, 30000);
