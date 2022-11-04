module.exports = {
  preset: 'ts-jest',
  testTimeout: 120000,
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
};
