/* eslint-disable import/no-extraneous-dependencies */
import rTracer from 'cls-rtracer';
import cors from 'cors';
import express, {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  NextFunction, Request, Response, ErrorRequestHandler,
} from 'express';
import cons from 'consolidate';
import logger from 'pino-http';
import { randomUUID } from 'node:crypto';
import promMid from 'express-prometheus-middleware';
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

const { Counter } = require('prom-client');

const httpRequestsTotal = new Counter({
  name: 'eth_sendUserOperation_requests',
  help: 'Total number of HTTP requests on eth_sendUserOperation',
  labelNames: ['method', 'route', 'code', 'rpc_method'], // Add your custom label here
});

app.options('*', cors()); // include before other routes

app.use(cors());
app.use(rTracer.expressMiddleware());
app.use(logger({
  genReqId(req, res) {
    const existingID = req.id ?? req.headers['x-request-id'];
    if (existingID) return existingID;
    const id = randomUUID();
    res.setHeader('Request-Id', id);
    return id;
  },
}));

app.engine('hbs', cons.handlebars);
app.set('view engine', 'hbs');
app.set('views', `${__dirname}/views`);

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

// Logging middleware
// app.use((req, _res, next) => {
//   console.log('--- New Request ---');
//   console.log('Timestamp:', new Date().toISOString());
//   console.log('Method:', req.method);
//   console.log('Path:', req.path);
//   console.log('Headers:', JSON.stringify(req.headers, null, 2));
//   console.log('Query:', JSON.stringify(req.query, null, 2));

//   // If using express.json() or express.urlencoded()
//   // to parse request bodies, you can log the body like this:
//   console.log('Body:', JSON.stringify(req.body, null, 2));

//   next(); // Important to call this to proceed to the next middleware
// });

app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  // Only proceed if the request method is 'eth_sendUserOperation'
  if (req.body?.method === 'eth_sendUserOperation') {
    const labels = {
      method: req.method,
      route: req.route?.path, // Adjust this based on your routes if needed.
      code: res.statusCode.toString(),
      rpc_method: 'eth_sendUserOperation',
    };

    console.log('Adding +1 because a requests is received in eth_sendUserOperation');
    httpRequestsTotal.labels(labels).inc();
  }

  next();
});

app.use(promMid({

  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5],
  requestLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
  responseLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
  customLabels: ['rpc_method'],
}));

app.use('', routes);

app.route('/health')
  .get((req, res) => {
    res.send('ok');
  });

app.route('/:chainId/health')
  .get((req, res) => {
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
