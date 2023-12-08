import { Router } from 'express';
import { bundlerRequestHandler } from '../../controllers';
import { simulateBundlerTransaction } from '../../controllers/simulate';
import {
  validateBundlerRequest,
  startDataDogTracer,
} from '../../middleware';
// import { authenticateBundlerRequest } from '../../controllers/auth';

export const bundlerApiRouter = Router();

bundlerApiRouter.post('/:chainId/:dappAPIKey', validateBundlerRequest(), startDataDogTracer(), simulateBundlerTransaction(), bundlerRequestHandler);
bundlerApiRouter.get('/:chainId/:bundlerApiKey', validateBundlerRequest(), bundlerRequestHandler);
