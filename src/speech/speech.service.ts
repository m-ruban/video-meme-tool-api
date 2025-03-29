import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { randStr } from 'src/utils';
import { PATH_TEMP_VIDEOS, PATH_ROOT } from 'src/utils';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const gTTS = require('gtts');

const LANG = 'ru';

@Injectable()
export class SpeechService {
  constructor() {}

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
}
