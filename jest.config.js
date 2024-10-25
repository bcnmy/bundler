// eslint-disable-next-line no-undef
module.exports = {
  preset: "ts-jest",
  testTimeout: 600000,
  testMatch: ["**/__tests__/**/*.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
  },
};
