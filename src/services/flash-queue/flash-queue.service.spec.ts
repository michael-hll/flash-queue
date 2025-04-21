import { Test, TestingModule } from '@nestjs/testing';
import { FlashQueueService } from './flash-queue.service';

describe('FlashQueueService', () => {
  let service: FlashQueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FlashQueueService],
    }).compile();

    service = module.get<FlashQueueService>(FlashQueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
