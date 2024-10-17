import pino from "pino";

const destination = pino.destination({ sync: false });

// Create the logger using the asynchronous destination
const logger = pino({}, destination);

export { logger };
