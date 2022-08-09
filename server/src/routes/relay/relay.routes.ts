import { Router } from 'express';
import { relayApi, feeOptionsApi, simulateApi } from '../../controllers';
import { validateRequest } from '../../middleware';
import { relaySchema, simulateOptionsSchema, feeOptionsSchema } from './relay.schema';

export const relayApiRouter = Router();

relayApiRouter.post('/simulate', validateRequest(simulateOptionsSchema), simulateApi);
relayApiRouter.post('/feeOptions', validateRequest(feeOptionsSchema), feeOptionsApi);
relayApiRouter.post('/', validateRequest(relaySchema), relayApi);
