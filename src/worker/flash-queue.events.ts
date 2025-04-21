import {
  QueueEventsListener,
  OnQueueEvent,
  QueueEventsHost,
} from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';

@QueueEventsListener('flash-queue')
export class FlashQueueEventsListener extends QueueEventsHost {
  private logger = new Logger(FlashQueueEventsListener.name);

  @OnQueueEvent('added')
  onAdded(job: { jobId: string; name: string }) {
    this.logger.log(`Job added: ${job.jobId} - ${job.name}`);
  }
}
