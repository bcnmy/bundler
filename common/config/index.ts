import _ from 'lodash';
import { IConfig, LooseObject } from './interface';

export class Config implements IConfig {
  public config: LooseObject = {};

  setup(): Boolean {
    // get config from config.yaml file
    this.config = {};
    return true;
  }

  update(data: Object): Boolean {
    this.config = _.merge(this.config, data);
    return true;
  }

  get(): Object {
    return this.config;
  }
}
