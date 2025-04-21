import { Controller, Get, Post, Body } from '@nestjs/common';
import { FlashQueueService } from './flash-queue.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('flash-queue')
export class FlashQueueController {
  constructor(
    private readonly flashQueueService: FlashQueueService,
    @InjectQueue('flash-queue') private readonly flashQueue: Queue,
  ) {}

  @Get('hello')
  getHello(): string {
    return this.flashQueueService.getHello();
  }

  @Post('add')
  async addPath(@Body() body: { percent: number }) {
    const priority = Math.floor(-body.percent * 1000);
    await this.flashQueue.add(
      'path',
      {
        name: 'flash',
        data: {
          age: 25,
          date: new Date(),
          score: 55.66,
        },
      },
      {
        backoff: 2000,
        priority,
      },
    );
  }
}
