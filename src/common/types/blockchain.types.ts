export interface StartArbitrageArgs {
  token0: string;
  borrowAmount: bigint | string;
  token1: string;
  token2: string;
  deadLineMin: number;
  slippages: number[];
}

export interface ArbitrageExecutedEvent {
  tokenBorrowed: string;
  amountBorrowed: string;
  amountReturned: string;
  profit: string;
  success: boolean;
}

export interface FlashLoanReceivedEvent {
  token: string;
  amount: string;
}

export interface TradeExecutedEvent {
  tradeNumber: number;
  fromToken: string;
  toToken: string;
  amountIn: string;
  amountOut: string;
}

export interface PoolLiquidityEvent {
  pair: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
}

export interface UnknownEvent {
  address?: string;
  topics?: any[];
  data?: string;
  name?: string;
  args?: Record<string, any>;
  error?: string;
}
