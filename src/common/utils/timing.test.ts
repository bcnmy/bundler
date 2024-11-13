import { formatHrtimeSeconds, measureTime } from "./timing";

describe("timing", () => {
  describe("formatHrtimeSeconds", () => {
    it("should format the hrtime in seconds", () => {
      const result = formatHrtimeSeconds([1, 500000000]);
      expect(result).toBe(1.5);
    });
  });

  describe("measureTime", () => {
    it("should measure the time it takes to execute a function", async () => {
      const result = await measureTime(async () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve("done");
          }, 1000);
        });
      });
      expect(result[0]).toBe("done");
      expect(result[1]).toBeGreaterThan(1);
    });
  });
});
