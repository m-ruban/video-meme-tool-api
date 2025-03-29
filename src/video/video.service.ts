import { Injectable } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as ffprobeStatic from 'ffprobe-static';
import { readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { PATH_ROOT, PATH_TEMP_VIDEOS, randStr } from 'src/utils';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const gTTS = require('gtts');

const LANG = 'ru';

// Устанавливаем пути к локальным бинарникам
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeStatic.path);

const AUDIO_FILE = 'audio.aac';

@Injectable()
export class VideoService {
  async extractFrames(inputPath: string, outputDir: string): Promise<string[]> {
    return new Promise((resolve) => {
      ffmpeg(inputPath)
        .outputOptions('-vf', 'fps=1')
        .output(`${outputDir}/frame-%03d.png`)
        .on('end', async () => {
          const frames = await this.getFramePaths(outputDir);
          return resolve(frames);
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
        if (err) return reject(err);
        resolve(metadata.format.duration || 0);
      });
    });
  }

  async extractAudio(inputPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve) => {
      ffmpeg(inputPath)
        .noVideo()
        .save(join(outputPath, AUDIO_FILE))
        .on('end', () => {
          const videoPart = PATH_ROOT.split('/')[1];
          const index = outputPath.indexOf(`/${videoPart}/`);
          return resolve(`${outputPath.slice(index)}/${AUDIO_FILE}`);
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
    return new Promise<void>((resolve) => {
      ffmpeg(input)
        .setStartTime(start)
        .setDuration(duration)
        .output(output)
        .on('end', () => resolve())
        .run();
    });
  }

  async replacePartAudio(inputAudio: string, replacementText: string, _startTime: number): Promise<string> {
    const _replacementAudio = await this.testSpeech(replacementText);
    const startTime = Number(_startTime);

    const partPath = inputAudio.replace(AUDIO_FILE, '');
    const tempPath = join(process.cwd(), 'public', partPath);
    const beforePart = join(tempPath, `${randStr()}.mp3`);
    const afterPart = join(tempPath, `${randStr()}.mp3`);
    const originalAudio = join(process.cwd(), 'public', inputAudio);
    const replacementAudio = join(process.cwd(), 'public', _replacementAudio);
    const output = join(tempPath, `${randStr()}.aac`);

    return new Promise<string>((resolve) => {
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
            .mergeToFile(output, PATH_TEMP_VIDEOS);
        });
      });
    });
  }
}
