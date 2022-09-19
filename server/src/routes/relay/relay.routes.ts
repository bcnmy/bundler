import { Router } from 'express';
import { simulateApi } from '../../../../common/simulate/simulate';
import { feeOptionsApi, relayApi } from '../../controllers';
import { validateRelayRequest, validateRequest } from '../../middleware';
import { simulateOptionsSchema, feeOptionsSchema } from './relay.schema';

export const relayApiRouter = Router();

relayApiRouter.get('/feeOptions', validateRequest(feeOptionsSchema), feeOptionsApi);
relayApiRouter.post('/simulate', validateRequest(simulateOptionsSchema), simulateApi);
relayApiRouter.post('/', validateRelayRequest, simulateApi, relayApi);
