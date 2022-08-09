import { Router } from 'express';
import { relayApi, feeOptionsApi } from '../../controllers/relay';
import { validateRequest } from '../../middleware';
import { relaySchema, feeOptionsSchema } from './relay.schema';

export const relayApiRouter = Router();

relayApiRouter.post('/', validateRequest(relaySchema), relayApi);
relayApiRouter.get('/feeOptions', validateRequest(feeOptionsSchema), feeOptionsApi);
