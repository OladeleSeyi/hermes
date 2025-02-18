import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  process.env.WORKER_PORT = process.env.WORKER_HTTP_PORT ?? '4000';
  await app.listen(Number(process.env.WORKER_PORT));
}
bootstrap();
