import { Injectable } from '@nestjs/common';

@Injectable()
export class FlashQueueService {
  getHello(): string {
    return 'Hello from FlashQueueService!';
  }
}
