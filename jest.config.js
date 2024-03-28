module.exports = {
  preset: "ts-jest",
  testTimeout: 600000,
  workerThreads: true,
  testMatch: ["**/__tests__/**/*.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
  },
};
