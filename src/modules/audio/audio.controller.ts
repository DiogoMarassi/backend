import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import type { Readable } from 'stream';

@Controller('audio')
export class AudioController {
  private readonly s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });

  @Get(':filename')
  async streamAudio(
    @Param('filename') filename: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const bucketName = process.env.AWS_BUCKET_NAME ?? '';
    const key = `audios/${filename}`;

    const head = await this.s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
    const fileSize = head.ContentLength ?? 0;

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

      const { Body } = await this.s3.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
        Range: `bytes=${start}-${end}`,
      }));
      (Body as Readable).pipe(res);
    } else {
      res.setHeader('Content-Length', fileSize);
      const { Body } = await this.s3.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
      (Body as Readable).pipe(res);
    }
  }
}
