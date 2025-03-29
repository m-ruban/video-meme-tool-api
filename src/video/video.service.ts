import { Injectable } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as ffprobeStatic from 'ffprobe-static';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { PATH_ROOT } from 'src/utils';

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
}
