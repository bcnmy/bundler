/**
 * Used for logging the RPC URL used without exposing the API key.
 * @param rpcUrl A URL that may contain an API key.
 * @returns The hostname of the URL, with the API key removed.
 */
export function hideRpcUrlApiKey(rpcUrl: string): string {
  const parsedUrl = new URL(rpcUrl);
  return parsedUrl.hostname;
}
