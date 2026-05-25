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
import { VideoService, Phrase, Overlay, PhraseMode } from 'src/video/video.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { FileTypePipe, UploadedFileWithType } from 'src/upload/file-type.pipe';

const FILE_SIZE = Math.pow(1024, 2) * 10; // 10 MB

interface TestSpeechDto {
  text: string;
  mode: PhraseMode;
  duration: number;
}

interface UpdateAudioDto {
  inputVideo: string;
  inputAudio: string;
  phrases: string;
  overlays: string;
}

interface UpdateMemeDto {
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
  async upload(@UploadedFile(FileTypePipe) file: UploadedFileWithType) {
    if (file.detectedMime.startsWith('image/')) {
      const { uploadedFile } = await this.uploadService.processImageFile(file);
      return uploadedFile;
    }

    // video branch
    const { uploadedFile, info } = await this.uploadService.processVideoFile(file);
    const { fullName, fullPath } = info;
    const frames = await this.videoService.extractFrames(fullName, fullPath);
    const duration = await this.videoService.getDuration(fullName);
    const mediaInfo = await this.videoService.getWidthAndHeight(fullName);
    const audio = await this.videoService.extractAudio(fullName, fullPath);
    const audioMp3 = await this.videoService.extractAudioMp3(fullName, fullPath);
    const waveform = await this.videoService.extractWaveform(fullName, fullPath, frames.length);
    return {
      ...uploadedFile,
      ...mediaInfo,
      duration,
      audio,
      audioMp3,
      waveform,
      frames,
    };
  }

  @UseGuards(AuthGuard)
  @Post('speech-test')
  async testSpeech(@Body() { text, mode, duration }: TestSpeechDto) {
    const link = await this.videoService.testSpeech(text, mode, duration);
    return { link };
  }

  @UseGuards(AuthGuard)
  @Post('update-audio')
  async updateAudio(@Body() { inputVideo, inputAudio, phrases: phrasesRaw, overlays: overlaysRaw }: UpdateAudioDto) {
    const parseRaw = <T>(raw: string) => {
      let result: T[] = [];
      try {
        result = JSON.parse(raw);
        if (!Array.isArray(result)) {
          throw new Error();
        }
      } catch {
        throw new BadRequestException('phrases must be a json array');
      } finally {
        return result;
      }
    };
    const phrases = parseRaw<Phrase>(phrasesRaw);
    const overlays = parseRaw<Overlay>(overlaysRaw);
    return await this.videoService.replacePartAudio(inputVideo, inputAudio, phrases, overlays);
  }

  @UseGuards(AuthGuard)
  @Post('save-meme')
  async saveMeme(@Body() { inputVideo }: UpdateMemeDto, @Ip() ipAddress: string) {
    const link = await this.videoService.saveMeme(inputVideo, ipAddress);
    return { link };
  }
}
