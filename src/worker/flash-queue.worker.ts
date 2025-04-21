import safeStringify from 'fast-safe-stringify';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { BlockchainService } from '../services/blockchain/blockchain.service';
import { StartArbitrageArgs } from 'src/common/types/blockchain.types';

@Processor('flash-queue', {
  concurrency: 5,
  limiter: {
    max: 5,
    duration: 10000,
  },
})
export class FlashQueueWorker extends WorkerHost {
  private logger = new Logger(FlashQueueWorker.name);

  constructor(private blockchainService: BlockchainService) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case 'path':
        await this.startArbitrage(job);
        break;
      default:
        this.logger.debug(`Unknow job id: ${job.id}, name: ${job.name}`);
        break;
    }
  }

  async startArbitrage(job: Job) {
    const args: StartArbitrageArgs = {
      token0: '0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7',
      borrowAmount: 35555n,
      token1: '0xFa60D973F7642B748046464e165A65B7323b0DEE',
      token2: '0x7ef95a0FEE0Dd31b22626fA2e10Ee6A223F8a684',
      deadLineMin: 0,
      slippages: [997, 997, 997],
    };
    const result = await this.blockchainService.startTriangleArbitrage(args);
    this.logger.debug(`Job ${job.id} result: ${safeStringify(result)}`);
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.debug(
      `Job ${job.id} is now active! with name: ${job.name}, priority: ${job.opts.priority}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(
      `Job ${job.id} completed!, prority: ${job.opts.priority}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.debug(`Job ${job.id} failed with error: ${err.message}`);
    this.logger.debug(`Attempts: ${job.attemptsMade}`);
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: number) {
    this.logger.debug(`Job ${job.id} progress: ${progress}%`);
  }
}
