import { Router } from 'express';
import { bundlerRequestHandler } from '../../controllers';
import { simulateBundlerTransaction } from '../../controllers/simulate';
import {
  validateBundlerRequest,
} from '../../middleware';

export const bundlerApiRouter = Router();

bundlerApiRouter.post('/:chainId/:dappAPIKey', validateBundlerRequest(), simulateBundlerTransaction(), bundlerRequestHandler);
