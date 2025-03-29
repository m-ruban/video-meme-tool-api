import { Controller, UseGuards, Post, Body } from '@nestjs/common';
import { SpeechService } from 'src/speech/speech.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('speech')
export class SpeechController {
  constructor(private speechService: SpeechService) {}

  @UseGuards(AuthGuard)
  @Post('test')
  async testSpeech(@Body() requestDto: { text: string }) {
    const link = await this.speechService.testSpeech(requestDto.text);
    return { link };
  }
}
