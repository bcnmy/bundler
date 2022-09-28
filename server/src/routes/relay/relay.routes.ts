import { Router } from 'express';
import { feeOptionsApi, relayApi } from '../../controllers';
import { simulateApi } from '../../controllers/simulate';
import { validateRelayRequest, validateRequest } from '../../middleware';
import { feeOptionsSchema, simulateOptionsSchema } from './relay.schema';

export const relayApiRouter = Router();

relayApiRouter.get('/feeOptions', validateRequest(feeOptionsSchema), feeOptionsApi);
relayApiRouter.post('/simulate', validateRequest(simulateOptionsSchema), simulateApi);
relayApiRouter.post('/', validateRelayRequest(), simulateApi, relayApi);
