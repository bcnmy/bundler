import { Request, Response } from 'express';

export const status = async (req: Request, res: Response) => {
  // call the service in common to get all the updated status
  res.render('status');
};
