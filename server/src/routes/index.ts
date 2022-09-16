import { Router } from 'express';
import { relayApiRouter } from './relay/relay.routes';
import { hookRouter } from './hook/hook.routes';

const routes = Router();

routes.use('/relay', relayApiRouter);
routes.use('/hook', hookRouter);

export { routes };
