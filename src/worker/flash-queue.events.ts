import {
  QueueEventsListener,
  OnQueueEvent,
  QueueEventsHost,
} from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@QueueEventsListener('flash-queue')
export class FlashQueueEventsListener extends QueueEventsHost {
  private logger = new Logger(FlashQueueEventsListener.name);

  @OnQueueEvent('added')
  onAdded(job: Job) {
    this.logger.debug(
      `Job added: ${job.id} - ${job.name} - ${job.opts.priority}`,
    );
  }
}
