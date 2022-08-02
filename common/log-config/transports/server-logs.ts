/* eslint-disable no-param-reassign */
import winston from 'winston';
import { hostname } from 'os';

const consoleTransport = new winston.transports.Console({
  level: process.env.LOG_LEVEL || 'debug',
});

const transports = [
  consoleTransport,
];

const serverTransport = (path: string) => winston.createLogger({
  // silent: false,
  format: process.env.NODE_ENV !== 'development'
    ? winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss SSS',
      }),
      winston.format((info: any) => {
        info.path = path;
        info.hostname = hostname();
        return info;
      })(),
      winston.format.json(),
    )
    : winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss SSS',
      }),
      winston.format.printf((_info: any) => {
        const info = _info;
        if (info.message.constructor === Object) {
          info.message = JSON.stringify(info.message, null, 4);
        }
        return `${info.timestamp} [${info.level}] ${path} - ${info.message}`;
      }),
    ),
  transports,
});

const logger = (module: { filename: string; }) => {
  const path = module.filename.split('/').slice(-4).join('/');
  return serverTransport(path);
};

export { logger };
