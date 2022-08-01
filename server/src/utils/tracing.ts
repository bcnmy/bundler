import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { AmqplibInstrumentation } from '@opentelemetry/instrumentation-amqplib';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { MongooseInstrumentation } from 'opentelemetry-instrumentation-mongoose';

// For troubleshooting, set the log level to DiagLogLevel.DEBUG
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const hostName = process.env.OTEL_TRACE_HOST || 'localhost';

const options = {
  tags: [],
  endpoint: `http://${hostName}:14268/api/traces`,
};

export const init = (serviceName: string) => {
  const exporter = new JaegerExporter(options);

  const provider = new NodeTracerProvider();
  provider.register();
  provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  // provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  console.log('tracing initialized');

  registerInstrumentations({
    instrumentations: [
      getNodeAutoInstrumentations(),
      new ExpressInstrumentation(),
      new HttpInstrumentation(),
      new MongooseInstrumentation(),
      new AmqplibInstrumentation(),
      new WinstonInstrumentation(),
    ],
    tracerProvider: provider,
  });
  const tracer = provider.getTracer(serviceName);

  return { tracer };
};
