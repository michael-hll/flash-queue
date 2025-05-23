import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port =
    configService.get<number>('app.port') || process.env.PORT || 3000;
  await app.listen(port);
  logger.verbose(`Application listening on port ${port}`);
}
bootstrap();
