/* eslint-disable no-param-reassign */
import winston from 'winston';
import { context, Span, trace } from '@opentelemetry/api';
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
        const span: Span | undefined = trace.getSpan(context.active());
        if (span) {
          const { traceId } = span.spanContext();
          info.traceId = traceId;
        }
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
        const span: Span | undefined = trace.getSpan(context.active());
        let spanData = '';
        if (span) {
          const { traceId } = span.spanContext();
          spanData = ` [tid-${traceId}] `;
        }
        if (info.message.constructor === Object) {
          info.message = JSON.stringify(info.message, null, 4);
        }
        return `${info.timestamp}${spanData} [${info.level}] ${path} - ${info.message}`;
      }),
    ),
  transports,
});

const logger = (module: { filename: string; }) => {
  const path = module.filename.split('/').slice(-4).join('/');
  return serverTransport(path);
};

export { logger };
