import { Router } from 'express';
import { relayApi, feeOptionsApi, simulateApi, /*ccmpApi*/ } from '../../controllers';
import { validateRequest } from '../../middleware';
import { relaySchema, simulateOptionsSchema, feeOptionsSchema, /*ccmpSchema*/ } from './relay.schema';

export const relayApiRouter = Router();

relayApiRouter.get('/feeOptions', validateRequest(feeOptionsSchema), feeOptionsApi);
relayApiRouter.post('/simulate', validateRequest(simulateOptionsSchema), simulateApi);
// relayApiRouter.get('/ccmp/estimateFees', validateRequest(ccmpSchema), ccmpApi);
// relayApiRouter.post('/ccmp/payFees', validateRequest(ccmpSchema), ccmpApi);
// relayApiRouter.get('/ccmp/messageStatus', validateRequest(ccmpSchema), ccmpApi); // TODO: take in txn hash and source chain id
relayApiRouter.post('/', validateRequest(relaySchema), simulateApi, relayApi);
