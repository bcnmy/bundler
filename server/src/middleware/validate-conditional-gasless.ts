import { RequestHandler } from 'express';

export const validateConditionalGasless: RequestHandler = async (req, res, next) => {
    return next();
}