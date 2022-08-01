import debug from 'debug';
import fs from 'fs';
import http from 'http';
import https from 'https';
import { config } from '../config';
import app from './app';

let server: any;

function normalizePort(val: string) {
  const portNumber = parseInt(val, 10);

  if (Number.isNaN(portNumber)) {
    // named pipe
    return val;
  }

  if (portNumber >= 0) {
    // port number
    return portNumber;
  }

  return false;
}
const port = normalizePort(process.env.PORT || '3000');

/**
   * Event listener for HTTP server "error" event.
   */

function onError(error: any) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? `Pipe ${port}`
    : `Port ${port}`;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
   * Event listener for HTTP server "listening" event.
   */

function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? `pipe ${addr}`
    : `port ${addr.port}`;
  debug(`Listening on ${bind}`);
}

const init = async () => {
  const enableHttps = config.enableHttps === 'true';

  /**
   * Get port from environment and store in Express.
   */

  app.set('port', port);

  const options = {
    key: fs.readFileSync('./server.key'),
    cert: fs.readFileSync('./server.cert'),
    requestCert: false,
    rejectUnauthorized: false,
  };

  /**
   * Create HTTPS server.
   * For localhost generate key using command
   * openssl req -nodes -new -x509 -keyout server.key -out server.cert
   */
  if (!enableHttps) {
    server = http.createServer(app);
  } else {
    server = https.createServer(options, app);
  }

  /**
   * Listen on provided port, on all network interfaces.
   */

  (async () => {
    try {
      server.listen(port);
      server.on('listening', () => onListening());
      console.log(`App listening on port ${port}`);
    } catch (error) {
      server.on('error', onError(error));
      console.log(error);
    }
  })();
};

export {
  init,
};
