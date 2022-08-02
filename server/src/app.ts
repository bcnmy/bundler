import rTracer from 'cls-rtracer';
import cors from 'cors';
import express, {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  NextFunction, Request, Response, ErrorRequestHandler,
} from 'express';

import { routes } from './routes';

const app = express();

declare global {
  namespace Express {
    interface Request {
      userId: string,
      dappId: string,
      networkId: string,
    }
  }
}

app.use(cors());
app.use(rTracer.expressMiddleware());

// Add headers
app.use((
  req: Request,
  res: { setHeader: (arg0: string, arg1: any) => void; },
  next: NextFunction,
) => {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Request methods you wish to allow
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS, PUT, PATCH, DELETE',
  );

  // Request headers you wish to allow
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-Requested-With,content-type',
  );

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

app.use('/api/v1', routes);

app.route('/health')
  .get((req, res) => {
    console.log('Inside /health route');
    res.send('ok');
  });

// error handler
app.use((
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) => res.status(300).json(err.message));

export default app;
