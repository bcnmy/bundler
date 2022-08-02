import { Router } from 'express';
import { relayApi } from '../../controllers/relay';
import { validateRequest } from '../../middleware';
import { relaySchema } from './relay.schema';
import { validateConditionalGasless } from '../../middleware/validate-conditional-gasless';

export const relayApiRouter = Router();

relayApiRouter.get('/', validateRequest(relaySchema), validateConditionalGasless, relayApi);
