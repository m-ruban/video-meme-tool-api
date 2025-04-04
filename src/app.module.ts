import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from 'src/auth/auth.module';
import { AppController } from 'src/app.controller';
import { GlobalJwtModule } from 'src/jwt/jwt.module';
import { UploadModule } from 'src/upload/upload.module';
import { VideoModule } from 'src/video/video.module';
import { DataBaseOptions } from 'src/configs/db.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync(DataBaseOptions),
    GlobalJwtModule,
    AuthModule,
    UploadModule,
    VideoModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
