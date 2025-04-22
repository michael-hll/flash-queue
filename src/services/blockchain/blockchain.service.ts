import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonRpcProvider, Wallet } from 'ethers';
import * as AsyncLock from 'async-lock';
import { FlashSwap } from 'src/typechain-types-copy/contracts/FlashSwap';
import { FlashSwap__factory } from 'src/typechain-types-copy/factories/contracts/FlashSwap__factory';
import safeStringify from 'fast-safe-stringify';
import { Logger } from '@nestjs/common';
import {
  ArbitrageExecutedEvent,
  FlashLoanReceivedEvent,
  PoolLiquidityEvent,
  StartArbitrageArgs,
  TradeExecutedEvent,
  UnknownEvent,
} from 'src/common/types/blockchain.types';

@Injectable()
export class BlockchainService {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private flashSwapContract: FlashSwap;
  private logger = new Logger(BlockchainService.name);

  // Add a nonce tracking mechanism
  private lastNonce: number = -1;
  private noncelock = new AsyncLock();

  // Add this method to safely get an incremented nonce
  private async getNextNonce(): Promise<number> {
    return this.noncelock.acquire('nonce', async () => {
      if (this.lastNonce === -1) {
        // Initialize from the network if this is the first call
        this.lastNonce = await this.wallet.getNonce('pending');
      } else {
        // Otherwise just increment our tracked nonce
        this.lastNonce++;
      }
      return this.lastNonce;
    });
  }

  private async resetNonce(): Promise<number> {
    return this.noncelock.acquire('nonce', async () => {
      try {
        const networkNonce = await this.wallet.getNonce('pending');
        if (this.lastNonce !== networkNonce) {
          this.logger.debug(
            `Nonce reset from ${this.lastNonce} to ${networkNonce}`,
          );
        }
        this.lastNonce = networkNonce;
        return this.lastNonce;
      } catch (error) {
        this.logger.error(`Failed to reset nonce: ${error.message}`);
        throw error;
      }
    });
  }

  constructor(private configService: ConfigService) {
    const network = this.configService.get<string>('blockchain.network');
    this.logger.verbose(`Network: ${network}`);

    const rpcUrl = this.configService.get<string>(
      `blockchain.${network}.rpcUrl`,
    );

    const privateKey = this.configService.get<string>('PRIVATE_KEY');
    const flashSwapAddress = this.configService.get<string>(
      `blockchain.${network}.contracts.flashSwap`,
    );

    this.provider = new JsonRpcProvider(rpcUrl as string);
    this.wallet = new Wallet(privateKey!, this.provider);

    // Connect using the factory
    this.flashSwapContract = FlashSwap__factory.connect(
      flashSwapAddress!,
      this.wallet,
    );
    this.flashSwapContract
      .getAddress()
      .then((address) => {
        this.logger.verbose(`FlashSwap contract address: ${address}`);
      })
      .catch((error) => {
        this.logger.error(`Error getting contract address: ${error}`);
      });
  }

  async startTriangleArbitrage(args: StartArbitrageArgs) {
    try {
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice;

      if (!gasPrice) {
        throw new Error('Failed to get gas price');
      }

      const gasMultiplier =
        this.configService.get<number>('blockchain.bsc.gasMultiplier') ?? 1.2;

      const adjustedGasPrice =
        (gasPrice * BigInt(Math.floor(gasMultiplier * 100))) / BigInt(100);

      const defaultGasLimit =
        this.configService.get<number>('blockchain.bsc.defaultGasLimit') ??
        3_000_000;

      // If static call succeeded, send actual transaction
      try {
        const nonce = await this.getNextNonce();
        this.logger.debug(`Using nonce ${nonce} for transaction`);
        const tx = await this.flashSwapContract.start(
          args.token0,
          args.borrowAmount,
          args.token1,
          args.token2,
          args.deadLineMin,
          args.slippages,
          {
            gasPrice: adjustedGasPrice,
            gasLimit: BigInt(defaultGasLimit),
            nonce,
          },
        );

        this.logger.log(`Transaction sent: ${tx.hash}`);

        const receipt = await tx.wait();
        const events = this.parseFlashSwapEvents(receipt);
        this.logEvents(events);

        return {
          success: receipt?.status === 1,
          txHash: receipt?.hash,
          gasUsed: receipt?.gasUsed?.toString() || '0',
          effectiveGasPrice: receipt?.gasPrice?.toString() || '0',
          timestamp: new Date().toISOString(),
          path: `${args.token0} -> ${args.token1} -> ${args.token2}`,
          events: events,
        };
      } catch (error) {
        this.logger.error(`Transaction failed: ${error.message}`);

        // Determine if we should reset the nonce based on error type
        const shouldResetNonce =
          // Reset on network errors
          error.code === 'NETWORK_ERROR' ||
          error.code === 'TIMEOUT' ||
          // Reset on provider errors
          error.code === 'SERVER_ERROR' ||
          // Reset if transaction wasn't sent (no receipt)
          !error.receipt;

        if (shouldResetNonce) {
          this.logger.debug('Resetting nonce due to error type');
          await this.resetNonce();
        }

        if (error.receipt) {
          const events = this.parseFlashSwapEvents(error.receipt);
          this.logEvents(events);

          return {
            success: false,
            txHash: error.receipt.hash,
            gasUsed: error.receipt.gasUsed?.toString() || '0',
            effectiveGasPrice: error.receipt.gasPrice?.toString() || '0',
            timestamp: new Date().toISOString(),
            path: `${args.token0} -> ${args.token1} -> ${args.token2}`,
            error: error.message,
            events: events,
          };
        }

        throw error;
      }
    } catch (error) {
      this.logger.error('Flash loan execution failed:', error);
      throw error;
    }
  }

  /**
   * Extracts and parses events from a transaction receipt
   * @param receipt Transaction receipt from a flashswap transaction
   * @returns Parsed events in a structured format
   */
  parseFlashSwapEvents(receipt: any) {
    if (!receipt || !receipt.logs) {
      return { events: [] };
    }

    const events: {
      arbitrageExecuted: ArbitrageExecutedEvent[];
      flashLoanReceived: FlashLoanReceivedEvent[];
      tradeExecuted: TradeExecutedEvent[];
      poolLiquidity: PoolLiquidityEvent[];
      unknownEvents: UnknownEvent[];
    } = {
      arbitrageExecuted: [],
      flashLoanReceived: [],
      tradeExecuted: [],
      poolLiquidity: [],
      unknownEvents: [],
    };

    for (const log of receipt.logs) {
      try {
        const parsedLog = this.flashSwapContract.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });

        if (!parsedLog) {
          events.unknownEvents.push({
            address: log.address,
            topics: log.topics,
            data: log.data,
          });
          continue;
        }

        switch (parsedLog.name) {
          case 'ArbitrageExecuted':
            events.arbitrageExecuted.push({
              tokenBorrowed: parsedLog.args.tokenBorrowed,
              amountBorrowed: parsedLog.args.amountBorrowed.toString(),
              amountReturned: parsedLog.args.amountReturned.toString(),
              profit: parsedLog.args.profit.toString(),
              success: parsedLog.args.success,
            });
            break;

          case 'DebugFlashLoanReceived':
            events.flashLoanReceived.push({
              token: parsedLog.args.token,
              amount: parsedLog.args.amount.toString(),
            });
            break;

          case 'DebugTradeExecuted':
            events.tradeExecuted.push({
              tradeNumber: Number(parsedLog.args.tradeNumber),
              fromToken: parsedLog.args.fromToken,
              toToken: parsedLog.args.toToken,
              amountIn: parsedLog.args.amountIn.toString(),
              amountOut: parsedLog.args.amountOut.toString(),
            });
            break;

          case 'DebugPoolLiquidity':
            events.poolLiquidity.push({
              pair: parsedLog.args.pair,
              token0: parsedLog.args.token0,
              token1: parsedLog.args.token1,
              reserve0: parsedLog.args.reserve0.toString(),
              reserve1: parsedLog.args.reserve1.toString(),
            });
            break;

          default:
            events.unknownEvents.push({
              name: parsedLog.name,
              args: Object.fromEntries(
                Object.entries(parsedLog.args || {}).map(([key, value]) => [
                  key,
                  typeof value === 'bigint' ? value.toString() : value,
                ]),
              ),
            });
        }
      } catch (error) {
        this.logger.debug(`Error parsing log: ${error.message}`);
        events.unknownEvents.push({
          error: error.message,
          address: log.address,
          topics: log.topics,
          data: log.data,
        });
      }
    }

    return events;
  }

  /**
   * Formats and logs all events from a transaction receipt in a human-readable way
   * @param events The parsed events from parseFlashSwapEvents method
   */
  logEvents(events: any): void {
    this.logger.log('====== TRANSACTION EVENTS ======');

    // Log arbitrage executed events
    events.arbitrageExecuted.forEach((event: ArbitrageExecutedEvent) => {
      this.logger.log('\n✅ ARBITRAGE RESULTS:');
      this.logger.log(`Token Borrowed: ${event.tokenBorrowed}`);
      this.logger.log(
        `Amount Borrowed: ${this.formatUnits(event.amountBorrowed, 18)}`,
      );
      this.logger.log(
        `Amount Returned: ${this.formatUnits(event.amountReturned, 18)}`,
      );
      this.logger.log(`Profit: ${this.formatUnits(event.profit, 18)}`);
      this.logger.log(`Success: ${event.success}`);

      // Calculate ROI
      const amountBorrowed = BigInt(event.amountBorrowed);
      const profit = BigInt(event.profit);
      if (amountBorrowed > 0n) {
        const roi = Number((profit * 10000n) / amountBorrowed) / 100;
        this.logger.log(`ROI: ${roi}%`);
      }
    });

    // Log flash loan received events
    events.flashLoanReceived.forEach((event: FlashLoanReceivedEvent) => {
      this.logger.log('\n🔄 FLASH LOAN RECEIVED:');
      this.logger.log(`Token: ${event.token}`);
      this.logger.log(`Amount: ${this.formatUnits(event.amount, 18)}`);
    });

    // Log trade executed events
    events.tradeExecuted.forEach((event: TradeExecutedEvent) => {
      this.logger.log(`\n🔄 TRADE ${event.tradeNumber}:`);
      this.logger.log(`From: ${event.fromToken}`);
      this.logger.log(`To: ${event.toToken}`);
      this.logger.log(`Amount In: ${this.formatUnits(event.amountIn, 18)}`);
      this.logger.log(`Amount Out: ${this.formatUnits(event.amountOut, 18)}`);

      // Calculate and display price rate
      const amountIn = BigInt(event.amountIn);
      const amountOut = BigInt(event.amountOut);
      if (amountIn > 0n) {
        const rate = Number((amountOut * 1000000n) / amountIn) / 1000000;
        this.logger.log(`Rate: 1 token = ${rate} tokens`);
      }
    });

    // Log pool liquidity events
    events.poolLiquidity.forEach((event: PoolLiquidityEvent) => {
      this.logger.log('\n💧 POOL LIQUIDITY:');
      this.logger.log(`Pair: ${event.pair}`);
      this.logger.log(`Token0: ${event.token0}`);
      this.logger.log(`Token1: ${event.token1}`);
      this.logger.log(`Reserve0: ${this.formatUnits(event.reserve0, 18)}`);
      this.logger.log(`Reserve1: ${this.formatUnits(event.reserve1, 18)}`);
    });

    // Log unknown events if any
    if (events.unknownEvents.length > 0) {
      this.logger.log('\n❓ UNKNOWN EVENTS:');
      events.unknownEvents.forEach((event: UnknownEvent) => {
        this.logger.log(safeStringify(event));
      });
    }

    this.logger.log('==============================');
  }

  /**
   * Helper method to format large numbers to human-readable format
   * Similar to ethers.formatUnits
   */
  private formatUnits(value: string, decimals: number = 18): string {
    const valueBigInt = BigInt(value);
    const divisor = BigInt(10) ** BigInt(decimals);
    const integerPart = valueBigInt / divisor;
    const fractionalPart = valueBigInt % divisor;

    // Pad the fractional part with leading zeros if needed
    let fractionalStr = fractionalPart.toString();
    fractionalStr = fractionalStr.padStart(decimals, '0');

    // Trim trailing zeros
    fractionalStr = fractionalStr.replace(/0+$/, '');

    if (fractionalStr.length > 0) {
      return `${integerPart}.${fractionalStr}`;
    } else {
      return integerPart.toString();
    }
  }
}
