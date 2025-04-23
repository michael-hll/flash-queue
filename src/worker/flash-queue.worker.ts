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
      case 'flash':
        await this.startArbitrage(job);
        break;
      case 'flash-test': {
        const args = job.data as StartArbitrageArgs;
        if (!this.isValidFlashJobData(args)) {
          this.logger.error(`Invalid job data: ${safeStringify(args)}`);
          throw new Error('Invalid job data: ' + safeStringify(args));
        }
        this.logger.debug(
          `Job ${job.id} is a test job!, data: ${safeStringify(args)}`,
        );
        const result =
          await this.blockchainService.startTriangleArbitrage(args);
        this.logger.debug(`Job ${job.id} result: ${safeStringify(result)}`);
        break;
      }
      default:
        this.logger.debug(`Unknow job id: ${job.id}, name: ${job.name}`);
        break;
    }
  }

  async startArbitrage(job: Job) {
    const args = job.data as StartArbitrageArgs;
    if (!this.isValidFlashJobData(args)) {
      this.logger.error(`Invalid job data: ${safeStringify(args)}`);
      throw new Error('Invalid job data: ' + safeStringify(args));
    }
    this.logger.debug(`Job ${job.id}!, data: ${safeStringify(args)}`);
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

  private isValidFlashJobData(
    data: StartArbitrageArgs,
  ): data is StartArbitrageArgs {
    return (
      data &&
      typeof data.token0 === 'string' &&
      typeof data.borrowAmount === 'string' &&
      typeof data.token1 === 'string' &&
      typeof data.token2 === 'string' &&
      Array.isArray(data.slippages)
    );
  }
}
