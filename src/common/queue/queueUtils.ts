import nodeconfig from "config";

/**
 * Used to check if the queue message is stale and should be discarded
 * @param msg Any message that has a timestamp
 * @returns Should we discard the message if it's stale
 */
export function shouldDiscardStaleMessage(
  chainId: number,
  msg: { timestamp?: number },
  nowMilliseconds: number,
) {
  if (
    nodeconfig
      .get<number[]>("clearStaleMessages.supportedNetworks")
      .includes(chainId)
  ) {
    if (!msg.timestamp) {
      return true;
    }

    const ttlMilliseconds =
      nodeconfig.get<number>("clearStaleMessages.ttlSeconds") * 1000;

    return nowMilliseconds - msg.timestamp > ttlMilliseconds;
  }

  // we shouldn't discard any messages for unsupported networks
  return false;
}
