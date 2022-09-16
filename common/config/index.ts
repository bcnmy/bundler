import _ from 'lodash';
import config from './development.config.json';

import { IConfig, ConfigType } from './interface/IConfig';

function replaceData(data: any) {
  Object.keys(data).forEach((key: string) => {
    const value = data[key];
    if (typeof value === 'object') {
      replaceData(value);
    // eslint-disable-next-line no-prototype-builtins
    } else if (process.env.hasOwnProperty(key)) {
      // eslint-disable-next-line no-param-reassign
      data[key] = process.env[key];
    }
  });
  return data;
}

export class Config implements IConfig {
  public config: ConfigType | null;

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

  get(): ConfigType | null {
    return this.config;
  }
}
