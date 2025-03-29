import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { AppController } from 'src/app.controller';
import { GlobalJwtModule } from 'src/jwt/jwt.module';
import { UploadModule } from 'src/upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GlobalJwtModule,
    AuthModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
