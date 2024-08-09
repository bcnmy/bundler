import { UserOperationType } from "../../types";
import { getUserOpHash, packUserOperation } from "../PackedUserOperation";

describe("PackedUserOperation test", () => {
    const ENTRYPOINT_V7_ADDRESS = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
    const chainId = 84532n;

    describe.only("user op convertion 1", () => {
        it.only("user op with no simple fields", async () => {
        
        const correctHash = "0x42bfcf0ecae5b274838cba8bbe6c6012f2259014607d22248b3414337c26f25d";

        const userOp: UserOperationType = {
            sender: "0x1234567890abcdef1234567890abcdef12345678",
            nonce: 1n,
            initCode: "0x",
            callData: "0x",
            paymasterAndData: "0x",
            callGasLimit: 98000n,
            verificationGasLimit: 500000n,
            preVerificationGas: 21000n,
            maxPriorityFeePerGas: 1000000n,
            maxFeePerGas: 13156190n,
            signature: "0x",
        };

        const packedUserOp = packUserOperation(userOp); 
        expect(getUserOpHash(packedUserOp, ENTRYPOINT_V7_ADDRESS, chainId)).toEqual(correctHash);
        });
        it.only("fail user op with no simple fields", async () => {
        
            const correctHash = "0x42bfcf0ecae5b274838cba8bbe6c6012f2259014607d22248b3414337c26f25d";
    
            const userOp: UserOperationType = {
                sender: "0x1234567890abcdef1234567890abcdef12345678",
                nonce: 1n,
                initCode: "0x",
                callData: "0x",
                paymasterAndData: "0x",
                callGasLimit: 98000n,
                verificationGasLimit: 0n,
                preVerificationGas: 21000n,
                maxPriorityFeePerGas: 1000000n,
                maxFeePerGas: 13156190n,
                signature: "0x",
            };
    
            
            const packedUserOp = packUserOperation(userOp);
            expect(getUserOpHash(packedUserOp, ENTRYPOINT_V7_ADDRESS, chainId) === correctHash).toEqual(false);
            });
    });
});
