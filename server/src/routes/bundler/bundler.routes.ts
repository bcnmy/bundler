import { Router } from 'express';
import { bundlerRequestHandler } from '../../controllers';
import { simulateBundlerTransaction } from '../../controllers/simulate';
import {
  validateBundlerRequest,
} from '../../middleware';
import { authenticateBundlerRequest } from '../../controllers/auth';

export const bundlerApiRouter = Router();

bundlerApiRouter.post('/:chainId/:apiKey', validateBundlerRequest(), authenticateBundlerRequest(), simulateBundlerTransaction(), bundlerRequestHandler);
bundlerApiRouter.get('/:chainId/:apiKey', validateBundlerRequest(), bundlerRequestHandler);
