import _ from 'lodash';

import { IConfig, ConfigType } from './interface/IConfig';

class Config implements IConfig {
  config: ConfigType;

  constructor(config: ConfigType) {
    this.config = config;
  }

  setup(data: ConfigType) {
    // load json based on env
    // decrypt the .env file
    try {
      // merge missing config from .env file and validate
      this.config = data;
    } catch (e) {
      console.log(e);
    }
  }

  update(data: object): boolean {
    this.config = _.merge(this.config, data);
    return true;
  }

  get(): ConfigType {
    return this.config;
  }
}

const configData = {};
const configInstance = new Config(configData);
export const config = configInstance.get();
