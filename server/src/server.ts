import http from 'http';
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
  console.log(`Listening on ${bind}`);
}

const init = async () => {
  /**
   * Get port from environment and store in Express.
   */

  app.set('port', port);

  server = http.createServer(app);

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
