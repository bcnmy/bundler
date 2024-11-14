import pino from "pino";

/**
 * Formats the process.hrtime in seconds.
 * @param hrtime - The hrtime to be formatted.
 * @returns The formatted hrtime in seconds.
 */
export const formatHrtimeSeconds = (hrtime: [number, number]) => {
  const nanoseconds = hrtime[0] * 1e9 + hrtime[1];
  return nanoseconds / 1e9;
};

/**
 * A helper function to measure the time it takes to execute a function
 * @param fn - The function to be executed
 * @returns The time it took to execute the function in seconds
 */
export const measureTime = async <T>(
  fn: () => Promise<T>,
): Promise<[T, number]> => {
  const start = process.hrtime();
  const result = await fn();
  const end = process.hrtime(start);
  return [result, formatHrtimeSeconds(end)];
};

/**
 * A helper function to log the time it takes to execute a function, given a pino logger
 * @param fn - The function to be executed
 * @param message - The message to be logged
 * @returns The time it took to execute the function in seconds
 */
export const logMeasureTime = async <T>(
  log: pino.Logger,
  message: string,
  fn: () => Promise<T>,
): Promise<[T, number]> => {
  const [result, time] = await measureTime(fn);
  log.info({ durationSeconds: time }, message);
  return [result, time];
};
