/**
 * Formats the process.hrtime in seconds.
 * @param hrtime - The hrtime to be formatted.
 * @returns The formatted hrtime in seconds.
 */
export const formatHrtimeSeconds = (hrtime: [number, number]) => {
  const nanoseconds = hrtime[0] * 1e9 + hrtime[1];
  return nanoseconds / 1e9;
};
