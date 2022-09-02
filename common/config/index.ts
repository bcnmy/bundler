import _ from 'lodash';
import { IConfig, NodeConfig } from './interface';

export class Config implements IConfig {
  public config: NodeConfig | undefined;

  setup(config: NodeConfig) {
    // get config from config.yaml file
    this.config = config;
  }

  update(data: object): boolean {
    this.config = _.merge(this.config, data);
    return true;
  }

  get(): NodeConfig {
    return this.config;
  }
}
