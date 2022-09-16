import { Router } from 'express';
import { relayAATransactionApi, feeOptionsApi, simulateApi } from '../../controllers';
import { validateRequest } from '../../middleware';
import { relaySchema, simulateOptionsSchema, feeOptionsSchema } from './relay.schema';

export const relayApiRouter = Router();

relayApiRouter.get('/feeOptions', validateRequest(feeOptionsSchema), feeOptionsApi);
relayApiRouter.post('/simulate', validateRequest(simulateOptionsSchema), simulateApi);
relayApiRouter.post('/aa', validateRequest(relaySchema), simulateApi, relayAATransactionApi);
