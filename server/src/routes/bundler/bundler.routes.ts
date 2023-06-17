import { Router } from 'express';
import { bundlerRequestHandler } from '../../controllers';
import { simulateBundlerTransaction } from '../../controllers/simulate';
import {
  // authorizeBundlerRequest,
  validateBundlerRequest,
} from '../../middleware';

export const bundlerApiRouter = Router();

bundlerApiRouter.post('/:chainId/:dappAPIKey', validateBundlerRequest(), simulateBundlerTransaction(), bundlerRequestHandler);
bundlerApiRouter.get('/:chainId/:bundlerApiKey', validateBundlerRequest(), bundlerRequestHandler);
