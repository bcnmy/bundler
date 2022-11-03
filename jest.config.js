module.exports = {
  preset: 'ts-jest',
  testTimeout: 30000,
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
};
