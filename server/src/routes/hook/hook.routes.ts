import { Request, Response } from 'express';
import { Router } from 'express';
import { hookApi } from '../../controllers';
import { validateRequest } from '../../middleware';
import { hookSchema } from './hook.schema';

export const hookRouter = Router();

hookRouter.post('/', validateRequest(hookSchema), hookApi);
