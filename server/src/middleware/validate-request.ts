import { AnySchema } from 'yup';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../log-config';

const log = logger(module);

export const validateRequest = (schema: AnySchema) => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await schema.validate({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    return next();
  } catch (e: any) {
    log.error(e);
    return res.status(400).send({
      code: 400,
      message: e.errors,
    });
  }
};
