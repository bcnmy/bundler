import { Router } from 'express';
import { feeOptionsApi, requestHandler } from '../../controllers';

export const relayApiRouter = Router();

relayApiRouter.get('/redis', feeOptionsApi);