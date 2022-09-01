import _ from 'lodash';
import { IConfig, LooseObject } from './interface';

export class Config implements IConfig {
  public config: LooseObject = {};

  setup(): boolean {
    // get config from config.yaml file
    this.config = {};
    return true;
  }

  update(data: object): boolean {
    this.config = _.merge(this.config, data);
    return true;
  }

  get(): object {
    return this.config;
  }
}
