import _ from 'lodash';

import { IConfig, ConfigType } from './interface/IConfig';

class Config implements IConfig {
  config: ConfigType | null;

  constructor() {
    this.config = null;
  }

  setup() {
    // load json based on env
    // decrypt the .env file
    try {
      const data: ConfigType = config;
      // merge missing config from .env file and validate
      console.log(data);
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

const configInstance = new Config();
export const config = configInstance.get();
