/* eslint-disable import/no-import-module-exports */
import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../../common/logger';
import tracer from '../../../tracer';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

export const startDataDogTracer = () => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { method } = req.body;
    const span = tracer.scope().active();
    if (span !== null) {
      log.info(`Span already active, hence setting request_id: ${req.headers['x-request-id']} and json_rpc_method: ${method} tag to current span`);
      span.setTag('http.request.id', req.headers['x-request-id']);
      span.setTag('http.request.json-rpc-method', method || 'method_undefined');
    }
    return next();
  } catch (error) {
    log.error(`Error in startDataDogTracer: ${JSON.stringify(error)}`);
    return next();
  }
};
