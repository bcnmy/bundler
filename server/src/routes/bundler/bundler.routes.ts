import { Router } from 'express';
import { bundlerRequestHandler } from '../../controllers';
import { simulateBundlerTransaction } from '../../controllers/simulate';
import {
  validateBundlerRequest,
} from '../../middleware';
// import { authenticateBundlerRequest } from '../../controllers/auth';

export const bundlerApiRouter = Router();

bundlerApiRouter.post('/:chainId/:dappAPIKey', validateBundlerRequest(), simulateBundlerTransaction(), bundlerRequestHandler, (req) => {
  (req as any).span.finish();
  (req as any).transactionIdSpan.finish();
});
bundlerApiRouter.get('/:chainId/:bundlerApiKey', validateBundlerRequest(), bundlerRequestHandler);
