import { Injectable } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as ffprobeStatic from 'ffprobe-static';
import { existsSync } from 'fs';
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
const AUDIO_FILE_MP3 = 'audio.mp3';
const WAVE_FORM_FILE = 'waveform.png';
const WIDTH_FRAME = 70;
const HEIGHT_FRAME = 50;

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

  async extractAudioMp3(inputPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .noVideo()
        .save(join(outputPath, AUDIO_FILE_MP3))
        .on('end', () => {
          const videoPart = PATH_ROOT.split('/')[1];
          const index = outputPath.indexOf(`/${videoPart}/`);
          return resolve(`${outputPath.slice(index)}/${AUDIO_FILE_MP3}`);
        })
        .on('error', (err) => {
          console.error('extractAudioMp3 error:', err);
          reject(err);
        });
    });
  }

  async extractWaveform(inputPath: string, outputPath: string, countFrames: number): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-filter_complex',
          `showwavespic=s=${countFrames * WIDTH_FRAME}x${HEIGHT_FRAME}:colors=0x738697`,
          '-frames:v 1',
        ])
        .output(join(outputPath, WAVE_FORM_FILE))
        .on('end', () => {
          const videoPart = PATH_ROOT.split('/')[1];
          const index = outputPath.indexOf(`/${videoPart}/`);
          return resolve(`${outputPath.slice(index)}/${WAVE_FORM_FILE}`);
        })
        .on('error', (err) => {
          console.error('extractWaveForm error:', err);
          reject(err);
        })
        .run();
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

  async getMeta(path: string): Promise<ffmpeg.FfprobeData> {
    return new Promise<ffmpeg.FfprobeData>((resolve) => ffmpeg.ffprobe(path, (_, meta) => resolve(meta)));
  }

  async replacePartAudio(
    inputVideo: string,
    inputAudio: string,
    replacementText: string,
    _startTime: number,
  ): Promise<string> {
    const originalVideo = join(process.cwd(), 'public', inputVideo);
    const originalAudio = join(process.cwd(), 'public', inputAudio);
    const replacementAudioPath = join(process.cwd(), 'public', await this.testSpeech(replacementText));

    const startTime = Number(_startTime);
    const output = join(process.cwd(), 'public', inputAudio.replace(AUDIO_FILE, ''), `${randStr()}.mp4`);
    const repMeta = await this.getMeta(replacementAudioPath);
    const repStream = repMeta.streams.find((stream: ffmpeg.FfprobeStream) => stream.codec_type === 'audio');
    const repDur = Number(repStream.duration || repMeta.format.duration);
    const afterStart = startTime + repDur;

    return new Promise<string>((resolve, reject) => {
      ffmpeg()
        .input(originalVideo)
        .input(originalAudio)
        .input(replacementAudioPath)
        .complexFilter([
          // original audio before startTime
          { filter: 'atrim', options: `end=${startTime}`, inputs: '1:a:0', outputs: 'pre' },
          { filter: 'asetpts', options: 'PTS-STARTPTS', inputs: 'pre', outputs: 'pre' },
          // replace audio
          { filter: 'asetpts', options: 'PTS-STARTPTS', inputs: '2:a:0', outputs: 'rep' },
          // original audio after afterStart
          { filter: 'atrim', options: `start=${afterStart}`, inputs: '1:a:0', outputs: 'post' },
          { filter: 'asetpts', options: 'PTS-STARTPTS', inputs: 'post', outputs: 'post' },
          // concat
          { filter: 'concat', options: { n: 3, v: 0, a: 1 }, inputs: ['pre', 'rep', 'post'], outputs: 'aout_raw' },
          // resampl
          { filter: 'aresample', options: 'async=1:first_pts=0', inputs: 'aout_raw', outputs: 'aout_pad' },
          { filter: 'apad', inputs: 'aout_pad', outputs: 'aout' },
        ])
        .outputOptions([
          '-map 0:v:0',
          '-map [aout]',
          '-c:v copy',
          '-c:a aac',
          '-movflags +faststart',
          '-shortest',
          '-fflags +genpts',
        ])
        .on('end', async () => {
          await unlink(replacementAudioPath);
          const videoPart = PATH_ROOT.split('/')[1];
          const index = output.indexOf(`/${videoPart}/`);
          resolve(output.slice(index));
        })
        .on('error', (err) => {
          console.error('replacePartAudio error:', err);
          reject(err);
        })
        .save(output);
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

  async validateMemeByLink(date: string, link: string): Promise<boolean> {
    const meme = await this.memeRepository.findOneBy({ link: `/video/${date}/${link}`, deleted: false });
    if (!meme) {
      return false;
    }
    const fullPath = join(PATH_ROOT_VIDEOS, `${date}`, `${link}.mp4`);
    if (!existsSync(fullPath)) {
      return false;
    }
    return true;
  }
}
