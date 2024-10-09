import pino from "pino";

const destination = pino.destination({ sync: false });

// Create the logger using the asynchronous destination
const logger = pino(
  {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        destination: 1
      },
    },
  },
  destination
);

export { logger };
