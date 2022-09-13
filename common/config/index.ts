import _ from 'lodash';
import yenv from 'yenv';

import { IConfig, NodeConfig } from './interface';

export class Config implements IConfig {
  public config: NodeConfig | null;

  constructor() {
    this.config = null;
  }

  setup() {
    // get config from config.yaml file
    try {
      const data: NodeConfig = yenv('config.yml');
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

  get(): NodeConfig | null {
    return this.config;
  }
}
