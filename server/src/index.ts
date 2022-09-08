import 'dotenv/config';
import { Config } from '../../common/config';

(async () => {
  // call config class to setup config
  // can update config using the config instance.
  const config = new Config();
  config.setup();
  const server = await import('./server');
  // if ( === 'done') {
    server.init();
    // await import('./service-manager');
  // }
})();
