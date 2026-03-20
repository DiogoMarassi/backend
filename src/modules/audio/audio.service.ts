import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);

  async generateAudio(text: string, lessonId: string): Promise<string> {
    const audiosDir = path.join(process.cwd(), 'public', 'audios');
    if (!fs.existsSync(audiosDir)) {
      fs.mkdirSync(audiosDir, { recursive: true });
    }

    const outputFileName = `lesson_${lessonId}.wav`;
    const outputPath = path.join(audiosDir, outputFileName);
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
      throw new Error(`piper.exe não encontrado em: ${piperBin}\nDefina PIPER_PATH no .env`);
    }
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Modelo não encontrado em: ${modelPath}`);
    }

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(piperBin, ['--model', modelPath, '--output_file', outputPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.dirname(piperBin), // piper precisa encontrar espeak-ng-data na sua pasta
      });

      let stderr = '';
      proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

      proc.on('error', (err) => {
        this.logger.error(`Erro ao iniciar Piper: ${err.message}`);
        reject(new Error(`Não foi possível iniciar o Piper: ${err.message}`));
      });

      proc.on('close', (code) => {
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

    return `/audios/${outputFileName}`;
  }
}
