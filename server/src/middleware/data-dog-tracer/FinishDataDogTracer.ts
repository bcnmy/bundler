import tracer from 'dd-trace';
import { NextFunction, Request, Response } from 'express';

export const finishDataDogTracer = () => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { method } = req.body;
  const span = tracer.startSpan('http.request');
  span.setTag('requestId', req.headers['x-request-id']);
  span.setTag('jsonRpcMethod', method || 'method_undefined');
  (req as any).span = span;
  return next();
};
