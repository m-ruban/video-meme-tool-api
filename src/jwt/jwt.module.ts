import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: {
          expiresIn: String(process.env.JWT_EXPIRES_IN_HOURS),
        },
      }),
    }),
  ],
  exports: [JwtModule],
})
export class GlobalJwtModule {}
