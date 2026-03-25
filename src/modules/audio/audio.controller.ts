import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Storage } from '@google-cloud/storage';

@Controller('audio')
export class AudioController {
  private readonly storage = new Storage();

  @Get(':filename')
  async streamAudio(
    @Param('filename') filename: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const bucketName = process.env.GCS_BUCKET_NAME ?? '';
    const file = this.storage.bucket(bucketName).file(`audios/${filename}`);

    const [metadata] = await file.getMetadata();
    const fileSize = parseInt(metadata.size as string, 10);

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Accept-Ranges', 'bytes');

    const rangeHeader = req.headers['range'];

    if (rangeHeader) {
      const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize);

      file.createReadStream({ start, end }).pipe(res);
    } else {
      res.setHeader('Content-Length', fileSize);
      file.createReadStream().pipe(res);
    }
  }
}
