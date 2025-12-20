import { Injectable } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as ffprobeStatic from 'ffprobe-static';
import { existsSync, renameSync, copyFileSync } from 'fs';
import { readdir, unlink, rm } from 'fs/promises';
import { join } from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PATH_ROOT, PATH_TEMP_VIDEOS, randStr, PATH_ROOT_VIDEOS, removeSuffix, checkAndCreatePath } from 'src/utils';
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
const PATH_PATTERN = /public\/video\/\d{4}-\d{2}-\d{2}\/[A-Za-z0-9]{10}-\d{13}$/;

export interface ReplaceAudioResult {
  link: string;
  duration: number;
  ext: string;
  name: string;
}

export type PhraseMode = 'stretch' | 'fill';

export interface Phrase {
  label: string;
  start: number;
  duration: number;
  mode: PhraseMode;
}

type Segment = { kind: 'orig'; start: number; end: number | null } | { kind: 'rep'; inputIdx: number };

@Injectable()
export class VideoService {
  constructor(
    @InjectRepository(Meme)
    private memeRepository: Repository<Meme>,
  ) {}

  /**
   * Create frames from video
   * @param inputPath path to video
   * @param outputDir path for save frames
   * @returns array of paths
   */
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

  /**
   * Get frames into folders
   * @param folderPath path to folder
   * @returns array of paths
   */
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

  /**
   * Get duration from meta data
   * @param inputPath path to media
   * @returns duration info
   */
  async getDuration(inputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          console.error('getDuration error:', err);
          return reject(err);
        }
        const replicaStream = metadata.streams.find((stream: ffmpeg.FfprobeStream) => stream.codec_type === 'audio');
        resolve(Number(replicaStream.duration || metadata.format.duration));
      });
    });
  }

  /**
   * Extract audio sourse (aac format)
   * @param inputPath path to video
   * @param outputPath path for new audio sourse
   * @returns path for audio
   */
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

  /**
   * Extract audio sourse (mp3 format)
   * @param inputPath path to video
   * @param outputPath path for new audio sourse
   * @returns path for audio
   */
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

  /**
   * Create image, which represents waveform of the audio source
   * @param inputPath path to video
   * @param outputPath path for save image
   * @param countFrames the number of frames generated early (need for image size)
   * @returns path to waveform
   */
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

  /**
   * Splits a tempo value into a sequence of valid FFmpeg `atempo` filters.
   * FFmpeg only accepts `atempo` values in the 0.5–2.0 range
   *
   * Examples:
   *   tempo = 4    → ["atempo=2", "atempo=2"]
   *   tempo = 0.25 → ["atempo=0.5", "atempo=0.5"]
   *
   * @param tempo Target speed ratio (originalDuration / targetDuration)
   * @returns Array of valid `atempo` filters for FFmpeg
   */
  buildAtempoFilters(tempo: number): string[] {
    const filters: string[] = [];

    let remaining = tempo;
    if (!isFinite(remaining) || remaining <= 0) {
      remaining = 1;
    }

    while (remaining < 0.5 || remaining > 2) {
      const part = remaining < 1 ? 0.5 : 2;
      filters.push(`atempo=${part}`);
      remaining /= part;
    }

    filters.push(`atempo=${remaining}`);
    return filters;
  }

  /**
   * Apply stretch mode, based on using atempo filter
   * @param inputPath path to audio
   * @param targetDuration duration, which needs to be obtained
   * @param originalDuration duration based on meta info
   * @returns path to new audio source
   */
  async applyStretch(inputPath: string, targetDuration: number, originalDuration: number): Promise<string> {
    if (!targetDuration || targetDuration <= 0) {
      return inputPath;
    }

    const tempo = originalDuration / targetDuration;
    const filters = this.buildAtempoFilters(tempo);
    const outPath = inputPath.replace(/\.mp3$/i, '_processed.mp3');

    return new Promise<string>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters(filters)
        .on('error', (err) => {
          console.error('applyStretch error:', err);
          reject(err);
        })
        .on('end', () => {
          resolve(outPath);
        })
        .save(outPath);
    });
  }

  /**
   * Apply fill mode, audio will be filled silence
   * @param inputPath path to audio
   * @param targetDuration duration, which needs to be obtained
   * @param originalDuration duration based on meta info
   * @returns path to new audio source
   */
  async applyFill(inputPath: string, targetDuration: number, originalDuration: number): Promise<string> {
    if (!targetDuration || targetDuration <= 0) {
      return inputPath;
    }
    if (originalDuration >= targetDuration) {
      return inputPath;
    }

    const outPath = inputPath.replace(/\.mp3$/i, '_processed.mp3');

    return new Promise<string>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters('apad')
        .duration(targetDuration)
        .on('error', (err) => {
          console.error('applyFill error:', err);
          reject(err);
        })
        .on('end', () => {
          resolve(outPath);
        })
        .save(outPath);
    });
  }

  /**
   * Generate speech based on text and mode
   * @param text text of speech
   * @param mode mode for phrase (fill - will be filled silence, stretch - will be stretched to target duration)
   * @param duration target duration
   * @returns path to new audio
   */
  async testSpeech(text: string, mode: PhraseMode = 'fill', duration: number): Promise<string> {
    const filename = `${randStr()}.mp3`;
    const fullPath = join(PATH_TEMP_VIDEOS, filename);

    return await new Promise<string>((resolve, reject) => {
      const gtts = new gTTS(text, LANG);
      gtts.save(fullPath, async (err: Error | null) => {
        if (err) {
          console.error('testSpeech error:', err);
          reject(err);
          return;
        }

        const originalDuration = await this.getDuration(fullPath);
        let processedFile: string;
        if (mode === 'stretch') {
          processedFile = await this.applyStretch(fullPath, duration, originalDuration);
        } else if (mode === 'fill') {
          processedFile = await this.applyFill(fullPath, duration, originalDuration);
        }
        // ffmpeg cannot edit existing files in-place
        renameSync(processedFile, fullPath);

        const videoPart = PATH_ROOT.split('/')[1];
        const index = fullPath.indexOf(`/${videoPart}/`);
        resolve(fullPath.slice(index));
      });
    });
  }

  /**
   * Based on array of phrases and original audio, generate new audio source
   * @param inputVideo original video
   * @param inputAudio original audio
   * @param phrases array of phrases
   * @returns link to new video
   */
  async replacePartAudio(inputVideo: string, inputAudio: string, phrases: Phrase[]): Promise<ReplaceAudioResult> {
    const originalVideo = join(process.cwd(), 'public', inputVideo);
    const originalAudio = join(process.cwd(), 'public', inputAudio);

    // prepare phrases
    const sortedPhrases = [...phrases].sort((a, b) => a.start - b.start);
    const replacements = await Promise.all(
      sortedPhrases.map(async ({ label, start, mode, duration }) => {
        const file = await this.testSpeech(label, mode, duration);
        const path = join(process.cwd(), 'public', file);
        const durationFromMeta = await this.getDuration(path);
        return { start, path, duration: durationFromMeta };
      }),
    );

    // generate segsments
    const origalDuration = await this.getDuration(originalAudio);
    const segments: Segment[] = [];
    let cursor = 0;
    let nextInput = 2; // 0: video, 1: original, next — replace
    for (const replacement of replacements) {
      if (replacement.start > cursor) {
        segments.push({ kind: 'orig', start: cursor, end: replacement.start }); // gap
      }
      segments.push({ kind: 'rep', inputIdx: nextInput }); // replace
      cursor = replacement.start + replacement.duration;
      nextInput += 1;
    }
    if (cursor < origalDuration) {
      segments.push({ kind: 'orig', start: cursor, end: null }); // end
    }

    // filters
    const complex: any[] = [];
    const concatIns: string[] = [];
    segments.forEach((segment, index) => {
      const out = `seg${index}`;
      if (segment.kind === 'orig') {
        const trimOut = `${out}_t`;
        const opts = segment.end == null ? `start=${segment.start}` : `start=${segment.start}:end=${segment.end}`;
        complex.push(
          { filter: 'atrim', options: opts, inputs: '1:a:0', outputs: trimOut },
          { filter: 'asetpts', options: 'PTS-STARTPTS', inputs: trimOut, outputs: out },
        );
      } else {
        complex.push({ filter: 'asetpts', options: 'PTS-STARTPTS', inputs: `${segment.inputIdx}:a:0`, outputs: out });
      }
      concatIns.push(out);
    });

    complex.push(
      { filter: 'concat', options: { n: concatIns.length, v: 0, a: 1 }, inputs: concatIns, outputs: 'aout_raw' },
      { filter: 'aresample', options: 'async=1:first_pts=0', inputs: 'aout_raw', outputs: 'aout' },
    );

    // call ffmpeg
    const ext = '.mp4';
    const name = `${randStr()}${ext}`;
    const output = join(process.cwd(), 'public', inputAudio.replace(AUDIO_FILE, ''), name);

    return new Promise<ReplaceAudioResult>((resolve, reject) => {
      const ffmpegCommand = ffmpeg().input(originalVideo).input(originalAudio);
      for (const replacement of replacements) {
        ffmpegCommand.input(replacement.path);
      }
      ffmpegCommand
        .complexFilter(complex)
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
          // чистим tts файлы
          await Promise.all(replacements.map((replacement) => unlink(replacement.path).catch(() => {})));
          const videoPart = PATH_ROOT.split('/')[1];
          const idx = output.indexOf(`/${videoPart}/`);
          const duration = await this.getDuration(output);
          resolve({ link: output.slice(idx), duration, ext, name });
        })
        .on('error', async (err) => {
          await Promise.all(replacements.map((replacement) => unlink(replacement.path).catch(() => {})));
          console.error('replacePartsAudio error:', err);
          reject(err);
        })
        .save(output);
    });
  }

  async saveMeme(inputVideo: string, ipAddress: string): Promise<string> {
    const originalVideo = join(process.cwd(), 'public', inputVideo);
    const tmpPath = removeSuffix(originalVideo, '.mp4');
    const danas = new Date().toISOString().slice(0, 10);
    const outputDirectory = join(PATH_ROOT_VIDEOS, `/${danas}`);
    const outputPath = join(outputDirectory, `${randStr()}-${Date.now()}.mp4`);
    checkAndCreatePath(outputDirectory);

    // save regular path
    copyFileSync(originalVideo, outputPath);

    // prepare correct video path
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

    // clear tmp files
    await unlink(originalVideo);
    if (PATH_PATTERN.test(tmpPath)) {
      await rm(tmpPath, { recursive: true, force: true });
    }

    return Promise.resolve(link);
  }

  async getMemePath(date: string, link: string): Promise<string | false> {
    const fullPath = join(PATH_ROOT_VIDEOS, `${date}`, `${link}.mp4`);
    if (!existsSync(fullPath)) {
      return false;
    }
    return fullPath;
  }

  async getMemeByLink(date: string, link: string): Promise<Meme | false> {
    const meme = await this.memeRepository.findOneBy({ link: `/video/${date}/${link}`, deleted: false });
    if (!meme) {
      return false;
    }
    return meme;
  }
}
