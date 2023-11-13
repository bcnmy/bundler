import { Router } from 'express';
import { bundlerRequestHandler } from '../../controllers';
import { simulateBundlerTransaction } from '../../controllers/simulate';
import {
  validateBundlerRequest,
  startDataDogTracer,
  // finishDataDogTracer,
} from '../../middleware';
// import { authenticateBundlerRequest } from '../../controllers/auth';

export const bundlerApiRouter = Router();

bundlerApiRouter.post('/:chainId/:dappAPIKey', startDataDogTracer(), validateBundlerRequest(), simulateBundlerTransaction(), bundlerRequestHandler /** finishDataDogTracer */);
bundlerApiRouter.get('/:chainId/:bundlerApiKey', validateBundlerRequest(), bundlerRequestHandler);
