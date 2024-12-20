import { formatEther } from "viem";

export function getRequiredPrefund(userOp: {
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
  paymasterAndData:
    "0x00000f79b7faf42eebadba19acc07cd08af447890000000000000000000000005430eac2228c12577ed5179a4dee3aaa56a238a600000000000000000000000000000000000000000000000000000000676469c800000000000000000000000000000000000000000000000000000000676462c0000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000413824432901286f0f7794774baa5b55728fdccee0a7884049992c7f82471299477f978db2c8ce464433153e134f39af1a265406475b104bef19aa9cd2758e90da1c00000000000000000000000000000000000000000000000000000000000000",
  callGasLimit: 24276n,
  verificationGasLimit: 297166n,
  preVerificationGas: 493353887n,
  maxFeePerGas: 16261619n,
});

console.log(`Required prefund: ${formatEther(prefund)} ETH`);
// old pvg: 523923235734
