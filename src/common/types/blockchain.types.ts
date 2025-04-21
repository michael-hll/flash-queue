export interface StartArbitrageArgs {
  token0: string;
  borrowAmount: bigint;
  token1: string;
  token2: string;
  deadLineMin: number;
  slippages: number[];
}
