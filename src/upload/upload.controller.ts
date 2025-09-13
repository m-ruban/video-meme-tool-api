import {
  Controller,
  UseGuards,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  Ip,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from 'src/upload/upload.service';
import { VideoService, Phrase } from 'src/video/video.service';
import { AuthGuard } from 'src/auth/auth.guard';

const FILE_SIZE = Math.pow(1024, 2) * 10; // 10 MB

interface TestSpeechDto {
  text: string;
}

interface UpdateAudioDto {
  inputVideo: string;
  inputAudio: string;
  phrases: string;
}

interface UpdateMemeDto {
  inputAudio: string;
  inputVideo: string;
}

@Controller('video')
export class UploadController {
  constructor(
    private uploadService: UploadService,
    private videoService: VideoService,
  ) {}

  @UseGuards(AuthGuard)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: FILE_SIZE },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    const { uploadedFile, info } = await this.uploadService.processUserFile(file);
    const { fullName, fullPath } = info;
    const frames = await this.videoService.extractFrames(fullName, fullPath);
    const duration = await this.videoService.getDuration(fullName);
    const audio = await this.videoService.extractAudio(fullName, fullPath);
    const audioMp3 = await this.videoService.extractAudioMp3(fullName, fullPath);
    const waveform = await this.videoService.extractWaveform(fullName, fullPath, frames.length);
    return {
      ...uploadedFile,
      duration,
      audio,
      audioMp3,
      waveform,
      frames,
    };
  }

  @UseGuards(AuthGuard)
  @Post('speech-test')
  async testSpeech(@Body() requestDto: TestSpeechDto) {
    const link = await this.videoService.testSpeech(requestDto.text);
    return { link };
  }

  @UseGuards(AuthGuard)
  @Post('update-audio')
  async updateAudio(@Body() requestDto: UpdateAudioDto) {
    let phrases: Phrase[] = [];
    try {
      console.log();
      phrases = JSON.parse(requestDto.phrases);
      if (!Array.isArray(phrases)) {
        throw new Error();
      }
    } catch {
      throw new BadRequestException('phrases must be a json array');
    }
    return await this.videoService.replacePartAudio(requestDto.inputVideo, requestDto.inputAudio, phrases);
  }

  @UseGuards(AuthGuard)
  @Post('save-meme')
  async saveMeme(@Body() requestDto: UpdateMemeDto, @Ip() ipAddress: string) {
    const link = await this.videoService.saveMeme(requestDto.inputAudio, requestDto.inputVideo, ipAddress);
    return { link };
  }
}
