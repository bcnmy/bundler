import 'dotenv/config';
import { setupConfig } from '../config';

(async () => {
  const result = await setupConfig();
  if (result === 'done') {
    const service = await import('./service-manager');
    service.init();
  }
})();
