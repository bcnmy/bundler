import { Router } from 'express';
import { hookApi } from '../../controllers';

export const hookRouter = Router();

// TODO: ADD Validation
hookRouter.post('/', hookApi);
