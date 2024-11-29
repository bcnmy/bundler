import pino from "pino";

// Use sync mode in development to avoid out-of-order logs
const destination = pino.destination({
  sync: process.env.NODE_ENV === "development",
});

// Use the pretty logger in development, and JSON logger in production
const logger =
  process.env.NODE_ENV === "development"
    ? pino({
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        },
      })
    : pino({}, destination);

export { logger };
