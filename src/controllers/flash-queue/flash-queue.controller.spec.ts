import { Test, TestingModule } from '@nestjs/testing';
import { FlashQueueController } from './flash-queue.controller';

describe('FlashQueueController', () => {
  let controller: FlashQueueController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlashQueueController],
    }).compile();

    controller = module.get<FlashQueueController>(FlashQueueController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
