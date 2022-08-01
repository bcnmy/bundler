import { Router } from 'express';

import {
  getDappForSdk,
  gnosisWhitelistTarget,
  getTransactionStatus,
} from '../../controllers/sdk';

// Mexa SDK V2 routes
export const sdkRouter = Router();

sdkRouter.get('/dapp', getDappForSdk);
sdkRouter.get('/transaction-status', getTransactionStatus);
sdkRouter.post('/dapp/gnosis/whitelist-target', gnosisWhitelistTarget);
