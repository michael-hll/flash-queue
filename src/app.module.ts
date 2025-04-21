import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bullmq';
import { FlashQueueController } from './controllers/flash-queue/flash-queue.controller';
import { FlashQueueService } from './controllers/flash-queue/flash-queue.service';
import { FlashQueueWorker } from './worker/flash-queue.worker';
import { FlashQueueEventsListener } from './worker/flash-queue.events';
import { BlockchainService } from './services/blockchain/blockchain.service';
import appConfig from './config/app.config';
import blockchainConfig from './config/blockchain.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, blockchainConfig],
      envFilePath: '.env',
    }),
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
    BlockchainService,
  ],
})
export class AppModule {}
