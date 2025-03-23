import * as bcrypt from 'bcrypt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async signIn(login: string, enteredPassword: string): Promise<{ access_token: string }> {
    // find user
    const isUserMatch = login === process.env.API_USER_NAME;
    if (!isUserMatch) {
      throw new UnauthorizedException();
    }
    // check password
    const isPasswortdMatch = await bcrypt.compare(enteredPassword, process.env.API_PASSWORD);
    if (!isPasswortdMatch) {
      throw new UnauthorizedException();
    }
    return {
      access_token: await this.jwtService.signAsync({ login }),
    };
  }
}
