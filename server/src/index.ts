import 'dotenv/config';
import { setupConfig } from '../config';

(async () => {
  console.log('setting up config');
  const result = await setupConfig();
  const server = await import('./server');
  if (result === 'done') {
    server.init();
  }
})();
