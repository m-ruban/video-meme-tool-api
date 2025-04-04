import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from 'src/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api/v1');
  app.set('trust proxy', true);
  app.use(helmet());
  await app.listen(3000);
}
bootstrap();
