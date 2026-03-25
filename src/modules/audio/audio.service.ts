import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);
  private readonly storage = new Storage();

  async generateAudio(text: string, lessonId: string): Promise<string> {
    const outputFileName = `lesson_${lessonId}.wav`;
    const outputPath = path.join('/tmp', outputFileName);

    const rawModelPath = process.env.PIPER_MODEL ?? 'models\\fr_FR-upmc-medium.onnx';
    const modelPath = path.isAbsolute(rawModelPath)
      ? rawModelPath
      : path.join(process.cwd(), rawModelPath);
    const rawPiperPath = process.env.PIPER_PATH ?? 'piper.exe';
    const piperBin = path.isAbsolute(rawPiperPath)
      ? rawPiperPath
      : path.join(process.cwd(), rawPiperPath);

    this.logger.log(`piperBin  → [${piperBin}]`);
    this.logger.log(`modelPath → [${modelPath}]`);
    this.logger.log(`outputPath→ [${outputPath}]`);
    this.logger.log(`piper existe? ${fs.existsSync(piperBin)}`);
    this.logger.log(`model existe? ${fs.existsSync(modelPath)}`);

    if (!fs.existsSync(piperBin)) {
      throw new Error(`piper não encontrado em: ${piperBin}`);
    }
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Modelo não encontrado em: ${modelPath}`);
    }

    // ── 1. Gera o áudio localmente em /tmp ──────────────────────────────────
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(piperBin, ['--model', modelPath, '--output_file', outputPath], {
        stdio: ['pipe', 'ignore', 'pipe'],
        cwd: path.dirname(piperBin),
      });

      let stderr = '';
      proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

      const timeout = setTimeout(() => {
        proc.kill();
        reject(new Error('Piper timeout após 120s'));
      }, 120_000);

      proc.on('error', (err) => {
        clearTimeout(timeout);
        this.logger.error(`Erro ao iniciar Piper: ${err.message}`);
        reject(new Error(`Não foi possível iniciar o Piper: ${err.message}`));
      });

      proc.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve();
        } else {
          this.logger.error(`Piper saiu com código ${code}. stderr: ${stderr}`);
          reject(new Error(`Piper falhou (código ${code}): ${stderr}`));
        }
      });

      proc.stdin.write(text, 'utf8');
      proc.stdin.end();
    });

    // ── 2. Faz upload para o GCS ─────────────────────────────────────────────
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('GCS_BUCKET_NAME não definido nas variáveis de ambiente');
    }

    const destination = `audios/${outputFileName}`;
    await this.storage.bucket(bucketName).upload(outputPath, {
      destination,
      metadata: { contentType: 'audio/wav' },
    });

    // Remove arquivo temporário
    fs.unlink(outputPath, () => {});

    this.logger.log(`Áudio enviado para GCS: gs://${bucketName}/${destination}`);

    return `https://storage.googleapis.com/${bucketName}/${destination}`;
  }
}
