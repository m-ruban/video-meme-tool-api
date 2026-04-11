import { Controller, Param, Get, UnauthorizedException, Body, Post } from '@nestjs/common';
import { VideoService } from 'src/video/video.service';

interface OverlayoDto {
  inputVideo: string;
  inputImage: string;
  start: number;
  end: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

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

  @Post('/overlay/')
  async overlayImageOnVideo(@Body() { inputVideo, inputImage, start, end, x1, y1, x2, y2 }: OverlayoDto) {
    const link = await this.videoService.overlayImageOnVideo(inputVideo, inputImage, start, end, x1, y1, x2, y2);
    return { link };
  }
}
