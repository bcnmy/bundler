import { NextFunction, Request, Response } from 'express';
import { AnySchema } from 'yup';
import { logger } from '../../../common/log-config';

const log = logger(module);

export const validateRequest = (schema: AnySchema) => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    console.log("validating schema", req.body);

    await schema.validate({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    return next();
  } catch (e: any) {
    console.error(e);
    return res.status(400).send({
      code: 400,
      message: e.errors,
    });
  }
};
