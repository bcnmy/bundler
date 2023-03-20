import { Router } from 'express';
import { bundleRequestHandler } from '../../controllers';
import { simulateBundlerTransaction } from '../../controllers/simulate';
import {
  validateBundleRequest,
} from '../../middleware';

export const bundleApiRouter = Router();

bundleApiRouter.post('/:chainId/:dappAPIKey', validateBundleRequest(), simulateBundlerTransaction(), bundleRequestHandler);
