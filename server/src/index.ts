import 'dotenv/config';
import { setupConfig } from '../config';

(async () => {
  const result = await setupConfig();
  const server = await import('./server');
  if (result === 'done') {
    server.init();
    await import('./service-manager');
  }
})();
