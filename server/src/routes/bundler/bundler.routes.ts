import { Router } from 'express';
import { bundlerRequestHandler } from '../../controllers';
import { simulateBundlerTransaction } from '../../controllers/simulate';
import {
  validateBundlerRequest,
} from '../../middleware';

export const bundlerApiRouter = Router();

// TODO change to bundlerApiKey
bundlerApiRouter.post('/:chainId/:dappAPIKey', validateBundlerRequest(), simulateBundlerTransaction(), bundlerRequestHandler);
bundlerApiRouter.get('/:chainId/:bundlerApiKey', validateBundlerRequest(), bundlerRequestHandler);
