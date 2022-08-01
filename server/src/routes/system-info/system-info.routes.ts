import { Router } from 'express';
import { systemInfoAPI } from '../../controllers/system-info';
import { validateRequest } from '../../middleware';
import { systemInfoSchema } from './system-info.schema';

export const systemInfoAPIRouter = Router();

systemInfoAPIRouter.get('/', validateRequest(systemInfoSchema), systemInfoAPI);
