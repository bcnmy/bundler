export enum GasPriceType {
  DEFAULT = 'default',
  MEDIUM = 'medium',
  FAST = 'fast',
}

export type GasFeesType = {
  safeMaxPriorityFee: number,
  safeMaxFee: number,
  mediumMaxPriorityFee: number,
  mediumMaxFee: number,
  fastMaxPriorityFee: number,
  fastMaxFee: number,
};
