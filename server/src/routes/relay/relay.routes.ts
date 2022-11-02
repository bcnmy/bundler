import { Router } from 'express';
import { feeOptionsApi, requestHandler } from '../../controllers';
import { simulateTransaction } from '../../controllers/simulate';
import { validateRelayRequest, validateFeeOption } from '../../middleware';

export const relayApiRouter = Router();

relayApiRouter.get('/feeOptions', validateFeeOption, feeOptionsApi);
relayApiRouter.post('/', validateRelayRequest(), simulateTransaction(), requestHandler);
