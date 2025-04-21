import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonRpcProvider, Wallet } from 'ethers';
import { FlashSwap } from 'src/typechain-types-copy/contracts/FlashSwap';
import { FlashSwap__factory } from 'src/typechain-types-copy/factories/contracts/FlashSwap__factory';
import safeStringify from 'fast-safe-stringify';
import { Logger } from '@nestjs/common';

@Injectable()
export class BlockchainService {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private flashSwapContract: FlashSwap;
  private logger = new Logger(BlockchainService.name);

  constructor(private configService: ConfigService) {
    const network = this.configService.get<string>('blockchain.network');
    this.logger.verbose(`Network: ${network}`);

    const rpcUrl = this.configService.get<string>(
      `blockchain.${network}.rpcUrl`,
    );

    const privateKey = this.configService.get<string>('secrets.privateKey');
    this.logger.log(`Private key available: ${!!privateKey}`);
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
        this.logger.log(`FlashSwap contract address: ${address}`);
      })
      .catch((error) => {
        this.logger.error(`Error getting contract address: ${error}`);
      });
  }

  async startTriangleArbitrage(
    token0: string,
    borrowAmount: bigint,
    token1: string,
    token2: string,
    deadLineMin: number,
    slippages: number[],
  ) {
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

      const tx = await this.flashSwapContract.start(
        token0,
        borrowAmount,
        token1,
        token2,
        deadLineMin,
        slippages,
        {
          gasPrice: adjustedGasPrice,
          gasLimit: BigInt(defaultGasLimit),
        },
      );

      const receipt = await tx.wait();

      return {
        success: receipt?.status === 1,
        txHash: receipt?.hash || tx.hash,
        gasUsed: receipt?.gasUsed?.toString() || '0',
        effectiveGasPrice: receipt?.gasPrice?.toString() || '0',
        timestamp: new Date().toISOString(),
        path: `${token0} -> ${token1} -> ${token2}`,
        tx: safeStringify(tx),
        receipt: safeStringify(receipt),
      };
    } catch (error) {
      console.error('Flash loan execution failed:', error);
      throw error;
    }
  }
}
