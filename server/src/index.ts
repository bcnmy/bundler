import 'dotenv/config';
import { setupConfig, config } from '../config';

import { registerWebhook } from './services/webhook';

(async () => {
  const result = await setupConfig();
  const server = await import('./server');
  if (result === 'done') {
    server.init();
    await import('./service-manager');

    // await registerWebhook( // TODO: loop for all supported chains
    //   "http://localhost:3000/api/v1/hook",
    //   "temp_auth",
    //   4002,
    //   // config.ccmp.contracts[80001].Diamond,
    //   "0xaA02b9E819321838c932B0eD3e1dBE75F0CFAD5a",
    //   {
    //     "name": "CCMPMessageRouted",
    //     "topicid": "0xd104ea90f9fae928714248aaeace6818d814f775ed2883b9286841dc71b66ada",
    //     "blockConfirmations": 1, // TODO: get from config instead
    //     "processTransferLogs": true,
    // });

    await registerWebhook( // TODO: loop for all supported chains
      "http://localhost:3000/api/v1/hook",
      "temp_auth",
      43113,
      // config.ccmp.contracts[80001].Diamond,
      "0x53B309Ff259e568309A19810E3bF1647B6922afd",
      {
        "name": "CCMPMessageRouted",
        "topicid": "0xd104ea90f9fae928714248aaeace6818d814f775ed2883b9286841dc71b66ada",
        "blockConfirmations": 1, // TODO: get from config instead
        "processTransferLogs": true,
      }
    );

  }
})();
