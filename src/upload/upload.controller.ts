import { Controller, UseGuards, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from 'src/upload/upload.service';
import { VideoService } from 'src/video/video.service';
import { AuthGuard } from 'src/auth/auth.guard';

const FILE_SIZE = Math.pow(1024, 2) * 10; // 10 MB

@Controller('upload')
export class UploadController {
  constructor(
    private uploadService: UploadService,
    private videoService: VideoService,
  ) {}

  @UseGuards(AuthGuard)
  @Post('/')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: FILE_SIZE },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    const { uploadedFile, info } = await this.uploadService.processUserFile(file);
    const frames = await this.videoService.extractFrames(info.fullName, info.fullPath);
    const duration = await this.videoService.getDuration(info.fullName);
    const audio = await this.videoService.extractAudio(info.fullName, info.fullPath);
    return {
      ...uploadedFile,
      duration,
      audio,
      frames,
    };
  }
}
