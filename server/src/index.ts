import 'dotenv/config';

import { configInstance } from '../../config';

(async () => {
  if (configInstance.active()) {
    const server = await import('./server');
    server.init();
  } else {
    console.log('Config not active');
  }
})();
