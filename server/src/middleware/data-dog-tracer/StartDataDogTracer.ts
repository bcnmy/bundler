/* eslint-disable import/no-import-module-exports */
import tracer from 'dd-trace';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../../common/logger';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

export const startDataDogTracer = () => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { method } = req.body;
    const span = tracer.startSpan('http.request');
    span.setTag('requestId', req.headers['x-request-id']);
    span.setTag('jsonRpcMethod', method || 'method_undefined');
    (req as any).span = span;
    return next();
  } catch (error) {
    log.error(`Error in startDataDogTracer: ${JSON.stringify(error)}`);
    return next();
  }
};
