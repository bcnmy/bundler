import { Router } from 'express';
import { relayApiRouter } from './relay/relay.routes';

const routes = Router();

routes.use('/relay', relayApiRouter);

export { routes };
