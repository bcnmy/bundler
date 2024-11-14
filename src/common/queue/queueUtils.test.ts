import { shouldDiscardStaleMessage } from "./queueUtils";

describe("queueUtils", () => {
  describe("shouldDiscardStaleMessage", () => {
    it("should return true if the message is stale", () => {
      const chainId = 1;
      const msg = { timestamp: Date.now() - 1001 };
      const nowMilliseconds = Date.now();
      expect(shouldDiscardStaleMessage(chainId, msg, nowMilliseconds)).toBe(
        true,
      );
    });

    it("should return false if the message is not stale", () => {
      const chainId = 1;
      const msg = { timestamp: Date.now() };
      const nowMilliseconds = Date.now();
      expect(shouldDiscardStaleMessage(chainId, msg, nowMilliseconds)).toBe(
        false,
      );
    });

    it("should not discard the message if the chainId is not in the supportedNetworks", () => {
      const chainId = 2;
      const msg = { timestamp: Date.now() - 1001 };
      const nowMilliseconds = Date.now();
      expect(shouldDiscardStaleMessage(chainId, msg, nowMilliseconds)).toBe(
        false,
      );
    });
  });
});
