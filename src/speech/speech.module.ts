import { Module } from '@nestjs/common';
import { SpeechController } from 'src/speech/speech.controller';
import { SpeechService } from 'src/speech/speech.service';

@Module({
  imports: [],
  providers: [SpeechService],
  exports: [SpeechService],
  controllers: [SpeechController],
})
export class SpeechModule {}
