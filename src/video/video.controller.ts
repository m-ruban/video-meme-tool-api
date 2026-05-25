import { Controller, Param, Get, UnauthorizedException } from '@nestjs/common';
import { VideoService } from 'src/video/video.service';

@Controller('video')
export class VideoController {
  constructor(private videoService: VideoService) {}

  @Get('/:date/:link')
  async validateMemeByLink(@Param() params: { date: string; link: string }) {
    const meme = await this.videoService.getMemeByLink(params.date, params.link);
    const fullPath = await this.videoService.getMemePath(params.date, params.link);
    if (!meme || !fullPath) {
      throw new UnauthorizedException('file not valid');
    }
    const duration = await this.videoService.getDuration(fullPath);
    return { ...meme, duration };
  }
}
