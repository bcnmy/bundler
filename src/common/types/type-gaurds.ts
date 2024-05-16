import { EVM1559RawTransaction, EVMLegacyRawTransaction } from "./types";

export function isEVM1559RawTransaction(rawTransaction: Partial<EVM1559RawTransaction>): rawTransaction is EVM1559RawTransaction {
    return rawTransaction.type === "eip1559";
}

export function isEVMLegacyRawTransaction(rawTransaction: Partial<EVMLegacyRawTransaction>): rawTransaction is EVMLegacyRawTransaction {
    return rawTransaction.type === "legacy";
}