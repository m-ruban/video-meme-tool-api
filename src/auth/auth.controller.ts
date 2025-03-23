import { Body, Controller, HttpCode, HttpStatus, Post, Get, UseGuards } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('get-token')
  signIn(@Body() signInDto: Record<string, string>) {
    return this.authService.signIn(signInDto.login, signInDto.password);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @Get('test-token')
  test() {
    return { status: 'ok' };
  }
}
