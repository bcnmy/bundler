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

export const getLogger = (module: NodeModule) => logger.child({
    module: module.filename.split("/").slice(-4).join("/"),
  });
