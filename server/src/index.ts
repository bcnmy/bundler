/* eslint-disable import/no-import-module-exports */
/* eslint-disable import/first */
require('dotenv').config({ path: `${__dirname}/../../.env` });

import tracer from 'dd-trace';
import { logger } from '../../common/logger';
import { configInstance } from '../../config';

tracer.init({ logInjection: false });

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

(async () => {
  if (configInstance.active()) {
    const server = await import('./server');
    server.init();
  } else {
    log.info('Config not active');
  }
})();
