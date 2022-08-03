import { Router } from 'express';
import { relayApi } from '../../controllers/relay';
import { validateRequest } from '../../middleware';
import { relaySchema } from './relay.schema';

export const relayApiRouter = Router();

relayApiRouter.post('/', validateRequest(relaySchema), relayApi);
