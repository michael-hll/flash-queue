import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bullmq';
import { FlashQueueController } from './controllers/flash-queue/flash-queue.controller';
import { FlashQueueService } from './controllers/flash-queue/flash-queue.service';
import { FlashQueueWorker } from './worker/flash-queue.worker';
import { FlashQueueEventsListener } from './worker/flash-queue.events';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
      defaultJobOptions: {
        attempts: 2,
        removeOnComplete: 100,
        removeOnFail: 100,
        //backoff: 1, // delay in ms
      },
    }),
    BullModule.registerQueue({
      name: 'flash-queue',
    }),
  ],
  controllers: [AppController, FlashQueueController],
  providers: [
    AppService,
    FlashQueueService,
    FlashQueueWorker,
    FlashQueueEventsListener,
  ],
})
export class AppModule {}
