import pino from "pino";

const logger = pino({
  // level: 'info', // Set the log level
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  }, // ... other options
});

export { logger };
