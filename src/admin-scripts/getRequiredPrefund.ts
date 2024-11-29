 
function getRequiredPrefund(userOp: {
  paymasterAndData: string;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
}) {
  const multiplier = userOp.paymasterAndData !== "0x" ? 3n : 1n;

  const requiredGas =
    userOp.callGasLimit +
    userOp.verificationGasLimit * multiplier +
    userOp.preVerificationGas;

  return requiredGas * userOp.maxFeePerGas;
}

const prefund = getRequiredPrefund({
  paymasterAndData: "0x",
  callGasLimit: 651983n,
  verificationGasLimit: 1459741n,
  preVerificationGas: 313507n,
  maxFeePerGas: 15796905452n,
});

console.log(`Required prefund: ${prefund} wei`);
