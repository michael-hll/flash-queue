import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('flash-queue', {
  concurrency: 5,
  limiter: {
    max: 5,
    duration: 10000,
  },
})
export class FlashQueueWorker extends WorkerHost {
  async process(job: Job) {
    switch (job.name) {
      case 'path':
        await new Promise((resolve) => setTimeout(resolve, 2500));
        break;
      default:
        console.log(`Unknow job id: ${job.id}, name: ${job.name}`);
        break;
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    console.log(
      `Job ${job.id} is now active! with name: ${job.name}, priority: ${job.opts.priority}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`Job ${job.id} completed!, prority: ${job.opts.priority}`);
  }
  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    console.log(`Job ${job.id} failed with error: ${err.message}`);
    console.log(`Attempts: ${job.attemptsMade}`);
  }
  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: number) {
    console.log(`Job ${job.id} progress: ${progress}%`);
  }
}
