import { Injectable } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as ffprobeStatic from 'ffprobe-static';
import { readdir, unlink, rm } from 'fs/promises';
import { join } from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PATH_ROOT, PATH_TEMP_VIDEOS, randStr, PATH_ROOT_VIDEOS, removeSuffix } from 'src/utils';
import { Meme } from 'src/video/meme.entity';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const gTTS = require('gtts');

const LANG = 'ru';

// Устанавливаем пути к локальным бинарникам
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeStatic.path);

const AUDIO_FILE = 'audio.aac';

@Injectable()
export class VideoService {
  constructor(
    @InjectRepository(Meme)
    private memeRepository: Repository<Meme>,
  ) {}

  async extractFrames(inputPath: string, outputDir: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions('-vf', 'fps=1')
        .output(`${outputDir}/frame-%03d.png`)
        .on('end', async () => {
          const frames = await this.getFramePaths(outputDir);
          return resolve(frames);
        })
        .on('error', (err) => {
          console.error('extractFrames error:', err);
          reject(err);
        })
        .run();
    });
  }

  async getFramePaths(folderPath: string): Promise<string[]> {
    const files = await readdir(folderPath);
    return files
      .filter((file) => file.match(/^frame-\d+\.png$/))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((file) => {
        const fullPath = join(folderPath, file);
        const videoPart = PATH_ROOT.split('/')[1];
        const index = fullPath.indexOf(`/${videoPart}/`);
        return fullPath.slice(index);
      });
  }

  async getDuration(inputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          console.error('getDuration error:', err);
          return reject(err);
        }
        resolve(metadata.format.duration || 0);
      });
    });
  }

  async extractAudio(inputPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .noVideo()
        .save(join(outputPath, AUDIO_FILE))
        .on('end', () => {
          const videoPart = PATH_ROOT.split('/')[1];
          const index = outputPath.indexOf(`/${videoPart}/`);
          return resolve(`${outputPath.slice(index)}/${AUDIO_FILE}`);
        })
        .on('error', (err) => {
          console.error('extractAudio error:', err);
          reject(err);
        });
    });
  }

  async testSpeech(text: string): Promise<string> {
    const filename = `${randStr()}.mp3`;
    const fullPath = join(PATH_TEMP_VIDEOS, filename);

    return await new Promise<string>((resolve, reject) => {
      const gtts = new gTTS(text, LANG);
      gtts.save(fullPath, (err: Error | null) => {
        if (err) {
          console.error('testSpeech error:', err);
          reject(err);
        } else {
          const videoPart = PATH_ROOT.split('/')[1];
          const index = fullPath.indexOf(`/${videoPart}/`);
          resolve(fullPath.slice(index));
        }
      });
    });
  }

  async cutAudio(input: string, output: string, start: number, duration: number) {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(input)
        .setStartTime(start)
        .setDuration(duration)
        .output(output)
        .on('end', () => resolve())
        .on('error', (err) => {
          console.error('cutAudio error:', err);
          reject(err);
        })
        .run();
    });
  }

  async replacePartAudio(inputAudio: string, replacementText: string, _startTime: number): Promise<string> {
    const preparedAudio = await this.testSpeech(replacementText);
    const startTime = Number(_startTime);

    const partPath = inputAudio.replace(AUDIO_FILE, '');
    const tempPath = join(process.cwd(), 'public', partPath);
    const beforePart = join(tempPath, `${randStr()}.mp3`);
    const afterPart = join(tempPath, `${randStr()}.mp3`);
    const originalAudio = join(process.cwd(), 'public', inputAudio);
    const replacementAudio = join(process.cwd(), 'public', preparedAudio);
    const output = join(tempPath, `${randStr()}.aac`);

    return new Promise<string>((resolve, reject) => {
      ffmpeg.ffprobe(originalAudio, async (_, originalAudioMetadata) => {
        ffmpeg.ffprobe(replacementAudio, async (_, replacementAudioMetadata) => {
          // cut first part
          await this.cutAudio(originalAudio, beforePart, 0, startTime);

          // cut second part
          const totalDuration = originalAudioMetadata.format.duration;
          const replacementAudioDuration = replacementAudioMetadata.format.duration;
          const afterStart = startTime + replacementAudioDuration;
          const remainingLen = totalDuration - afterStart;
          await this.cutAudio(originalAudio, afterPart, afterStart, remainingLen);

          // inject sintered speech
          ffmpeg()
            .input(beforePart)
            .input(replacementAudio)
            .input(afterPart)
            .on('end', async () => {
              await unlink(replacementAudio);
              await unlink(beforePart);
              await unlink(afterPart);

              const videoPart = PATH_ROOT.split('/')[1];
              const index = output.indexOf(`/${videoPart}/`);
              resolve(output.slice(index));
            })
            .on('error', (err) => {
              console.error('replacePartAudio error:', err);
              reject(err);
            })
            .mergeToFile(output, PATH_TEMP_VIDEOS);
        });
      });
    });
  }

  async saveMeme(inputAudio: string, inputVideo: string, ipAddress: string): Promise<string> {
    const originalAudio = join(process.cwd(), 'public', inputAudio);
    const originalVideo = join(process.cwd(), 'public', inputVideo);
    const tmpPath = removeSuffix(originalVideo, '.mp4');

    const danas = new Date().toISOString().slice(0, 10);
    const outputPath = join(PATH_ROOT_VIDEOS, `/${danas}`, `${randStr()}-${Date.now()}.mp4`);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(originalVideo)
        .input(originalAudio)
        .outputOptions(['-map 0:v:0', '-map 1:a:0', '-c:v copy', '-c:a copy', '-shortest'])
        .on('end', async () => {
          const videoPart = PATH_ROOT.split('/')[1];
          const index = outputPath.indexOf(`/${videoPart}/`);
          const fileLink = outputPath.slice(index);
          const link = removeSuffix(fileLink, '.mp4');

          // save link
          const meme = new Meme();
          meme.link = link;
          meme.ipAddress = ipAddress;
          meme.deleted = false;
          await this.memeRepository.save(meme);

          // clear data
          await unlink(originalAudio);
          await unlink(originalVideo);
          await rm(tmpPath, { recursive: true, force: true });

          // return link
          resolve(link);
        })
        .on('error', (err) => {
          console.error('saveMeme error during merging:', err);
          reject(err);
        })
        .save(outputPath);
    });
  }
}
