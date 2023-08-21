// mumbai gas estimations
describe('Mumbai 4337 Gas Estimations', async () => {
  /** callGasLimit success test cases */
  // Biconomy Smart Account native asset transfer
  // Biconomy Smart Account single NFT transfer
  // Biconomy Smart Account 30 NFT transfers
  // Biconomy Smart Account 100 NFT transfers

  /** callGasLimit failure test cases */
  // Biconomy Smart Account native asset transfer

  /** verificationGasLimit failure test cases */
  // failure in validation phase for factory
  // failure in validation phase for account
  // failure in validation phase for payamster

  /** verificationGasLimit success test cases */
  // basic smart account deployment + signature and nonce validation
  // high gas for factory smart account deployment
  // high gas for account validateUserOp
  // high gas for paymaster validatePaymasterUserOp

  /** preVerificationGas test cases */
  // should give 5% profit
  // should give 10% profit
  // should give 50% profit
});
