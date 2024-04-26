export enum BLOCKCHAINS {
  MAINNET = 1,
  GOERLI = 5,
  POLYGON_MAINNET = 137,
  POLYGON_MUMBAI = 80001,
  BSC_TESTNET = 97,
  BSC_MAINNET = 56,
  POLYGON_ZKEVM_TESTNET = 1442,
  POLYGON_ZKEVM_MAINNET = 1101,
  ARBITRUM_GOERLI_TESTNET = 421613,
  ARBITRUM_ONE_MAINNET = 42161,
  ARBITRUM_NOVA_MAINNET = 42170,
  OPTIMISM_MAINNET = 10,
  OPTIMISM_GOERLI_TESTNET = 420,
  OP_BNB_MAINNET = 204,
  OP_BNB_TESTNET = 5611,
  MANTLE_MAINNET = 5000,
  MANTLE_TESTNET = 5001,
  AVALANCHE_MAINNET = 43114,
  AVALANCHE_TESTNET = 43113,
  MOONBEAM_MAINNET = 1284,
  MOONBASE_ALPHA_TESTNET = 1287,
  BASE_GOERLI_TESTNET = 84531,
  BASE_MAINNET = 8453,
  LINEA_TESTNET = 59140,
  LINEA_MAINNET = 59144,
  GANACHE = 1337,
  ASTAR_MAINNET = 592,
  CHILIZ_MAINNET = 88888,
  ASTAR_TESTNET = 81,
  CHILIZ_TESTNET = 88882,
  CORE_MAINNET = 1116,
  CORE_TESTNET = 1115,
  MANTA_TESTNET = 3441005,
  MANTA_MAINNET = 169,
  CAPX_CHAIN = 7116,
  COMBO_TESTNET = 91715,
  COMBO_MAINNET = 9980,
  ARBITRUM_SEPOLIA_TESTNET = 421614,
  SEPOLIA_TESTNET = 11155111,
  BERACHAIN_TESTNET = 80085,
  BLAST_SEPOLIA_TESTNET = 168587773,
  BASE_SEPOLIA_TESTNET = 84532,
  BLAST_MAINNET = 81457,
  SCROLL_SEPOLIA_TESTNET = 534351,
  SCROLL_MAINNET = 534352,
  ZEROONE_TESTNET = 56400,
  POLYGON_AMOY_TESTNET = 80002,
  ZEROONE_MAINNET = 27827,
  ZETA_CHAIN_MAINNET = 7000,
  ZETA_CHAIN_TESTNET = 7001,
  POLYGON_ZKEVM_TESTNET_CARDONA = 2442,
  GOLD_CHAIN_MAINNET = 4653,
  MANTLE_TESTNET_SEPOLIA = 5003,
  OLIVE_TESTNET = 8101902,
  DEGEN_MAINNET = 666666666,
}

export enum TransactionType {
  AA = "AA",
  SCW = "SCW",
  FUNDING = "FUNDING",
  BUNDLER = "BUNDLER",
}

export enum TransactionMethodType {
  SCW = "eth_sendSmartContractWalletTransaction",
  AA = "eth_sendUserOperation",
  BUNDLER = "eth_sendUserOperation",
}

export enum EthMethodType {
  ESTIMATE_USER_OPERATION_GAS = "eth_estimateUserOperationGas",
  GET_USER_OPERATION_BY_HASH = "eth_getUserOperationByHash",
  GET_USER_OPERATION_RECEIPT = "eth_getUserOperationReceipt",
  SUPPORTED_ENTRY_POINTS = "eth_supportedEntryPoints",
  CHAIN_ID = "eth_chainId",
  GAS_AND_GAS_PRICES = "eth_getUserOpGasFields",
  GET_USER_OPERATIONS_BY_API_KEY = "eth_getUserOperationsByApiKey",
  GET_TRANSACTION_COUNT = "eth_getTransactionCount",
  GET_BALANCE = "eth_getBalance",
  GAS_PRICE = "eth_gasPrice",
  FEE_HISTORY = "eth_feeHistory",
  MAX_PRIORITY_FEE_PER_GAS = "eth_maxPriorityFeePerGas",
  ESTIMATE_GAS = "eth_estimateGas",
  ETH_CALL = "eth_call",
  GET_TRANSACTION_RECEIPT = "eth_getTransactionReceipt",
  SEND_RAW_TRANSACTION = "eth_sendRawTransaction",
}

export enum BiconomyMethodType {
  GET_GAS_FEE_VALUES = "biconomy_getGasFeeValues",
  GET_USER_OPERATION_STATUS = "biconomy_getUserOperationStatus",
}

export enum UserOperationStateEnum {
  BUNDLER_MEMPOOL = "BUNDLER_MEMPOOL",
  SUBMITTED = "SUBMITTED",
  CONFIRMED = "CONFIRMED",
  FAILED = "FAILED",
  DROPPED_FROM_BUNDLER_MEMPOOL = "DROPPED_FROM_BUNDLER_MEMPOOL",
}

export enum RelayerDestinationSmartContractName {
  ENTRY_POINT = "Entry Point",
}

export enum SocketEventType {
  onTransactionHashGenerated = "transactionHashGenerated",
  onTransactionHashChanged = "transactionHashChanged",
  onTransactionMined = "transactionMined",
  onTransactionError = "error",
}

export enum TransactionStatus {
  IN_PROCESS = "IN_PROCESS",
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  DROPPED = "DROPPED",
}
