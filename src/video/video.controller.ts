import { Controller, Param, Get, UnauthorizedException } from '@nestjs/common';
import { VideoService } from 'src/video/video.service';

@Controller('meme')
export class VideoController {
  constructor(private videoService: VideoService) {}

  @Get('/:date/:link')
  async validateMemeByLink(@Param() params: { date: string; link: string }) {
    const result = await this.videoService.validateMemeByLink(params.date, params.link);
    if (!result) {
      throw new UnauthorizedException('file not valid');
    }
    return null; // 200 if it's ok
  }
}
