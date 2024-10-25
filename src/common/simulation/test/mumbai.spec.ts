describe("broken test", () => {
  it.todo("should be fixed");
});

//
//
// import { BytesLike, ethers } from "ethers";
// import { BiconomySmartAccount } from "@biconomy/account";
// import { logger } from "../../logger";
// import { BundlerSimulationService } from "../BundlerSimulationService";
// import { config } from "../../../config";
// import { EVMNetworkService } from "../../network";
// import {
//   AlchemySimulationService,
//   TenderlySimulationService,
// } from "../external-simulation";
// import { RedisCacheService } from "../../cache";
// import { MumbaiGasPrice } from "../../gas-price/networks/MumbaiGasPrice";
// import { EntryPointContractType, UserOperationType } from "../../types";
// import { PublicClient, createPublicClient, getContract, http } from "viem";

// const log = logger.child({
//   module: module.filename.split("/").slice(-4).join("/"),
// });

// // mumbai gas estimations
// describe("Mumbai 4337 Gas Estimations", () => {
//   let bundlerSimulationService: BundlerSimulationService;
//   let entryPointContract: EntryPointContractType;
//   let biconomySmartAccount: any;
//   let eoa: any;
//   let provider: PublicClient;

//   beforeEach(async () => {
//     const networkService = new EVMNetworkService({
//       chainId: 80001,
//       rpcUrl: config.chains.provider[80001],
//     });
//     const cacheService = RedisCacheService.getInstance();
//     const gasPriceService = new MumbaiGasPrice(cacheService, networkService, {
//       chainId: 80001,
//       EIP1559SupportedNetworks: [80001],
//     });
//     const alchemySimulationService = new AlchemySimulationService(
//       networkService,
//     );
//     const tenderlySimulationService = new TenderlySimulationService(
//       gasPriceService,
//       cacheService,
//       {
//         tenderlyUser: config.simulationData.tenderlyData.tenderlyUser,
//         tenderlyProject: config.simulationData.tenderlyData.tenderlyProject,
//         tenderlyAccessKey: config.simulationData.tenderlyData.tenderlyAccessKey,
//       },
//     );
//     bundlerSimulationService = new BundlerSimulationService(
//       networkService,
//       tenderlySimulationService,
//       alchemySimulationService,
//       gasPriceService,
//     );

//     provider = createPublicClient({
//       transport: http(config.chains.provider[80001]),
//     });
//     // this.provider = createPublicClient({
//     //   transport: http(this.rpcUrl),
//     // });
//     // entryPointContract = new ethers.Contract(
//     //   "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789",
//     //   config.abi.entryPointAbi,
//     //   provider,
//     // );
//     entryPointContract = getContract({
//       abi: config.abi.entryPointAbi,
//       address: "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789",
//       publicClient: provider,
//     });

//     // dummy private key generated for test cases
//     const privateKey =
//       "3ad70468b6436cdcb10056758ff81bf9cb70b29ba8c6cba8d80b932649136c82";
//     const signer = new ethers.Wallet(privateKey, provider);
//     eoa = await signer.getAddress();
//     log.info(`EOA address: ${eoa}`);

//     const biconomySmartAccountConfig = {
//       signer,
//       chainId: 80001,
//       rpcUrl: config.chains.provider[80001],
//     };

//     const biconomyAccount = new BiconomySmartAccount(
//       biconomySmartAccountConfig,
//     );
//     biconomySmartAccount = await biconomyAccount.init({ accountIndex: 0 });
//   });

//   /** callGasLimit success test cases */
//   // Biconomy Smart Account native asset transfer
//   it("Biconomy Smart Account native asset transfer", async () => {
//     const transaction = {
//       to: eoa,
//       value: ethers.utils.parseEther("0.0001"),
//       data: "0x",
//     };

//     const partialUserOp = await biconomySmartAccount.buildUserOp([transaction]);

//     const response = await bundlerSimulationService.estimateUserOperationGas({
//       userOp: partialUserOp as UserOperationType,
//       chainId: 80001,
//       entryPointContract,
//     });
//     expect(response);
//   });

//   // Biconomy Smart Account single NFT transfer
//   it("Biconomy Smart Account single NFT transfer", async () => {
//     const nftInterface = new ethers.utils.Interface([
//       "function safeMint(address _to)",
//     ]);
//     const scwAddress = await biconomySmartAccount.getSmartAccountAddress(0);
//     const data = nftInterface.encodeFunctionData("safeMint", [scwAddress]);

//     const nftAddress = "0x1758f42Af7026fBbB559Dc60EcE0De3ef81f665e"; // Todo // use from config
//     const transaction = {
//       to: nftAddress,
//       value: "0x",
//       data,
//     };

//     const partialUserOp = await biconomySmartAccount.buildUserOp([transaction]);

//     const response = await bundlerSimulationService.estimateUserOperationGas({
//       userOp: partialUserOp as UserOperationType,
//       chainId: 80001,
//       entryPointContract,
//     });
//     expect(response);
//   });

//   // Biconomy Smart Account 30 NFT transfers
//   it("Biconomy Smart Account 30 NFT transfers", async () => {
//     const nftInterface = new ethers.utils.Interface([
//       "function safeMint(address _to)",
//     ]);
//     const scwAddress = await biconomySmartAccount.getSmartAccountAddress(0);
//     const data = nftInterface.encodeFunctionData("safeMint", [scwAddress]);

//     const nftAddress = "0x1758f42Af7026fBbB559Dc60EcE0De3ef81f665e"; // Todo // use from config
//     const transaction = {
//       to: nftAddress,
//       value: "0x",
//       data,
//     };

//     const transactions = [transaction];
//     for (let index = 0; index < 30; index += 1) {
//       transactions.push(transaction);
//     }

//     const partialUserOp = await biconomySmartAccount.buildUserOp(transactions);

//     const response = await bundlerSimulationService.estimateUserOperationGas({
//       userOp: partialUserOp as UserOperationType,
//       chainId: 80001,
//       entryPointContract,
//     });
//     expect(response);
//   });

//   // Biconomy Smart Account 100 NFT transfers
//   it("Biconomy Smart Account 100 NFT transfers", async () => {
//     const nftInterface = new ethers.utils.Interface([
//       "function safeMint(address _to)",
//     ]);
//     const scwAddress = await biconomySmartAccount.getSmartAccountAddress(0);
//     const data = nftInterface.encodeFunctionData("safeMint", [scwAddress]);

//     const nftAddress = "0x1758f42Af7026fBbB559Dc60EcE0De3ef81f665e"; // Todo // use from config
//     const transaction = {
//       to: nftAddress,
//       value: "0x",
//       data,
//     };

//     const transactions = [transaction];
//     for (let index = 0; index < 99; index += 1) {
//       transactions.push(transaction);
//     }

//     const partialUserOp = await biconomySmartAccount.buildUserOp(transactions);

//     const response = await bundlerSimulationService.estimateUserOperationGas({
//       userOp: partialUserOp as UserOperationType,
//       chainId: 80001,
//       entryPointContract,
//     });
//     expect(response);
//   });

//   /** callGasLimit failure test cases */
//   // Biconomy Smart Account native asset transfer
//   it("Biconomy Smart Account native asset transfer", async () => {
//     const transaction = {
//       to: eoa,
//       value: ethers.utils.parseEther("10"),
//       data: "0x",
//     };

//     const partialUserOp = await biconomySmartAccount.buildUserOp([transaction]);

//     const response = await bundlerSimulationService.estimateUserOperationGas({
//       userOp: partialUserOp as UserOperationType,
//       chainId: 80001,
//       entryPointContract,
//     });
//     expect(response);
//   });

//   /** verificationGasLimit failure test cases */
//   // failure in validation phase for factory
//   // failure in validation phase for account
//   // failure in validation phase for payamster

//   /** verificationGasLimit success test cases */
//   // basic smart account deployment + signature and nonce validation
//   // high gas for factory smart account deployment
//   it("Should estimate correctly for deployment with factory with high gas", async () => {
//     const getSenderAndInitCode = async () => {
//       const smartAccountFactoryAddress =
//         "0x5991eEFb3498C98AEB4f2Dd5034768D394AD1EA6";

//       const smartAccountFactory = new ethers.Contract(
//         smartAccountFactoryAddress,
//         [
//           {
//             inputs: [
//               { internalType: "address", name: "_owner", type: "address" },
//               { internalType: "uint256", name: "_index", type: "uint256" },
//             ],
//             name: "deployCounterFactualAccount",
//             outputs: [
//               { internalType: "address", name: "proxy", type: "address" },
//             ],
//             stateMutability: "nonpayable",
//             type: "function",
//           },
//           {
//             inputs: [
//               { internalType: "address", name: "_owner", type: "address" },
//               { internalType: "uint256", name: "_index", type: "uint256" },
//             ],
//             name: "getAddressForCounterFactualAccount",
//             outputs: [
//               { internalType: "address", name: "_account", type: "address" },
//             ],
//             stateMutability: "view",
//             type: "function",
//           },
//         ],
//         provider,
//       );

//       const sender =
//         await smartAccountFactory.getAddressForCounterFactualAccount(eoa, 0);

//       const { data } =
//         await smartAccountFactory.populateTransaction.deployCounterFactualAccount(
//           eoa,
//           ethers.BigNumber.from("0"),
//         );

//       const initCode = ethers.utils.hexConcat([
//         smartAccountFactoryAddress,
//         data as BytesLike,
//       ]);

//       return {
//         sender,
//         initCode,
//       };
//     };

//     const { sender, initCode } = await getSenderAndInitCode();

//     const partialUserOp = {
//       sender,
//       nonce: 0,
//       initCode,
//       callData: "0x",
//       paymasterAndData: "0x",
//       verificationGasLimit: 0,
//       preVerificationGas: 0,
//       callGasLimit: 0,
//       maxFeePerGas: 0,
//       maxPriorityFeePerGas: 0,
//       signature:
//         "0x73c3ac716c487ca34bb858247b5ccf1dc354fbaabdd089af3b2ac8e78ba85a4959a2d76250325bd67c11771c31fccda87c33ceec17cc0de912690521bb95ffcb1b",
//     };

//     const response = await bundlerSimulationService.estimateUserOperationGas({
//       userOp: partialUserOp as UserOperationType,
//       chainId: 80001,
//       entryPointContract,
//     });
//     expect(response);
//   });

//   // high gas for account validateUserOp
//   it("Should estimate correctly for account validateUserOp with high gas", async () => {
//     const getSender = async () => {
//       const smartAccountFactoryAddress =
//         "0xF6dD70865c1d97aB2871aE25abA761334700c591";

//       const smartAccountFactory = new ethers.Contract(
//         smartAccountFactoryAddress,
//         [
//           {
//             inputs: [
//               { internalType: "address", name: "_owner", type: "address" },
//               { internalType: "uint256", name: "_index", type: "uint256" },
//             ],
//             name: "deployCounterFactualAccount",
//             outputs: [
//               { internalType: "address", name: "proxy", type: "address" },
//             ],
//             stateMutability: "nonpayable",
//             type: "function",
//           },
//           {
//             inputs: [
//               { internalType: "address", name: "_owner", type: "address" },
//               { internalType: "uint256", name: "_index", type: "uint256" },
//             ],
//             name: "getAddressForCounterFactualAccount",
//             outputs: [
//               { internalType: "address", name: "_account", type: "address" },
//             ],
//             stateMutability: "view",
//             type: "function",
//           },
//         ],
//         provider,
//       );

//       const sender =
//         await smartAccountFactory.getAddressForCounterFactualAccount(eoa, 0);

//       return {
//         sender,
//       };
//     };

//     const { sender } = await getSender();

//     // eslint-disable-next-line @typescript-eslint/no-unused-vars
//     const proxy = new ethers.Contract(
//       sender,
//       [
//         {
//           inputs: [
//             { internalType: "uint256", name: "batchId", type: "uint256" },
//           ],
//           name: "getNonce",
//           outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
//           stateMutability: "view",
//           type: "function",
//         },
//       ],
//       provider,
//     );

//     const partialUserOp = {
//       sender,
//       nonce: 0, // await proxy.getNonce(0) once deployed
//       initCode: "0x",
//       callData: "0x",
//       paymasterAndData: "0x",
//       verificationGasLimit: 0,
//       preVerificationGas: 0,
//       callGasLimit: 0,
//       maxFeePerGas: 0,
//       maxPriorityFeePerGas: 0,
//       signature:
//         "0x73c3ac716c487ca34bb858247b5ccf1dc354fbaabdd089af3b2ac8e78ba85a4959a2d76250325bd67c11771c31fccda87c33ceec17cc0de912690521bb95ffcb1b",
//     };

//     const response = await bundlerSimulationService.estimateUserOperationGas({
//       userOp: partialUserOp as UserOperationType,
//       chainId: 80001,
//       entryPointContract,
//     });
//     expect(response);
//   });

//   // high gas for paymaster validatePaymasterUserOp
//   it("Should estimate correctly for paymaster validatePaymasterUserOp with high gas", async () => {
//     const partialUserOp = await biconomySmartAccount.buildUserOp([]);

//     // paymaster address with high validationPaymasterUserOp() gas
//     // const paymasterAddress = '0xf7609a20a1DD9614fA0B3Cc35508F686e50dF517';
//     const paymasterAndData =
//       "0xf7609a20a1dd9614fa0b3cc35508f686e50df51700000000000000000000000002649f6d43556e76cf7a515a9f589bb23287378d00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000041f27674355fc0b55eb09f57156156c4ef9ee1c27d11788d8526d8b0ca95b550db6d29d010f8a3a920ff8666e8d1b083913a55e9cae493dd8dec7b5814aa57abfe1b00000000000000000000000000000000000000000000000000000000000000";
//     partialUserOp.paymasterAndData = paymasterAndData;

//     const response = await bundlerSimulationService.estimateUserOperationGas({
//       userOp: partialUserOp as UserOperationType,
//       chainId: 80001,
//       entryPointContract,
//     });
//     expect(response);
//   });

//   /** preVerificationGas test cases */
//   // should give 5% profit
//   // should give 10% profit
//   // should give 50% profit
// });
