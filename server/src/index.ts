/* eslint-disable import/no-import-module-exports */
/* eslint-disable import/first */
require('dotenv').config({ path: `${__dirname}/../../.env` });

import { logger } from '../../common/logger';
import { configInstance } from '../../config';
import tracer from '../tracer';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

(async () => {
  if (configInstance.active()) {
    const server = await import('./server');
    server.init();
    tracer.init({ logInjection: false });
  } else {
    log.info('Config not active');
  }
})();
