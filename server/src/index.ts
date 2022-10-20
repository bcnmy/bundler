import 'dotenv/config';

import { registerWebhook } from './services/webhook';
import { configInstance } from '../../config';

(async () => {
  if (configInstance.active()) {
    const server = await import('./server');
    server.init();

    await registerWebhook(
      // TODO: loop for all supported chains
      'http://localhost:3000/api/v1/hook',
      'temp_auth',
      43113,
      // config.ccmp.contracts[80001].Diamond,
      '0x53B309Ff259e568309A19810E3bF1647B6922afd',
      {
        name: 'CCMPMessageRouted',
        topicid: '0xd104ea90f9fae928714248aaeace6818d814f775ed2883b9286841dc71b66ada',
        blockConfirmations: 1, // TODO: get from config instead
        processTransferLogs: true,
      },
    );
  } else {
    console.log('Config not active');
  }
})();
