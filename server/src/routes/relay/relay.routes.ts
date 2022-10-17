import { Router } from 'express';
import { feeOptionsApi, requestHandler } from '../../controllers';
import { simulateTransaction } from '../../controllers/simulate';
import { validateRelayRequest, validateRequest } from '../../middleware';
import { feeOptionsSchema } from './relay.schema';

export const relayApiRouter = Router();

relayApiRouter.get('/feeOptions', validateRequest(feeOptionsSchema), feeOptionsApi);
relayApiRouter.post('/', simulateTransaction(), validateRelayRequest(), requestHandler);
