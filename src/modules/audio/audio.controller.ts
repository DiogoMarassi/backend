import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { Storage } from '@google-cloud/storage';

@Controller('audio')
export class AudioController {
  private readonly storage = new Storage();

  @Get(':filename')
  async streamAudio(@Param('filename') filename: string, @Res() res: Response) {
    const bucketName = process.env.GCS_BUCKET_NAME;
    const file = this.storage.bucket(bucketName).file(`audios/${filename}`);
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Accept-Ranges', 'bytes');
    file.createReadStream().pipe(res);
  }
}
