import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { spawn } from 'child_process';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);
  private readonly storage = new Storage();

  // ── Entry point ────────────────────────────────────────────────────────────

  async generateAudio(
    text: string,
    ttsProvider: 'piper' | 'gemini' = 'piper',
    apiKey?: string,
  ): Promise<string> {
    const outputFileName = `lesson_${crypto.randomUUID()}.wav`;
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) throw new Error('GCS_BUCKET_NAME não definido nas variáveis de ambiente');

    const wavBuffer =
      ttsProvider === 'gemini'
        ? await this.generateWithGemini(text, apiKey)
        : await this.generateWithPiper(text, outputFileName);

    await this.uploadToGcs(wavBuffer, outputFileName, bucketName);

    this.logger.log(`Áudio enviado para GCS: gs://${bucketName}/audios/${outputFileName}`);
    return `/api/audio/${outputFileName}`;
  }

  // ── Piper (local TTS binary) ───────────────────────────────────────────────

  private async generateWithPiper(text: string, outputFileName: string): Promise<Buffer> {
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

    if (!fs.existsSync(piperBin)) throw new Error(`Piper não encontrado em: ${piperBin}`);
    if (!fs.existsSync(modelPath)) throw new Error(`Modelo não encontrado em: ${modelPath}`);

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(piperBin, ['--model', modelPath, '--output_file', outputPath], {
        stdio: ['pipe', 'ignore', 'pipe'],
        cwd: path.dirname(piperBin),
      });

      let stderr = '';
      proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

      const timeout = setTimeout(() => { proc.kill(); reject(new Error('Piper timeout após 120s')); }, 120_000);

      proc.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Não foi possível iniciar o Piper: ${err.message}`));
      });

      proc.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) resolve();
        else reject(new Error(`Piper falhou (código ${code}): ${stderr}`));
      });

      proc.stdin.write(text, 'utf8');
      proc.stdin.end();
    });

    const buffer = fs.readFileSync(outputPath);
    fs.unlink(outputPath, () => { });
    return buffer;
  }

  // ── Gemini 2.5 Flash TTS ───────────────────────────────────────────────────

  private async generateWithGemini(text: string, apiKey?: string): Promise<Buffer> {
    const key = apiKey ?? process.env.GEMINI_API_KEY;
    if (!key) throw new Error('Chave de API Gemini não configurada');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${key}`;

    const body = {
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Aoede' },
          },
        },
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini TTS falhou (${response.status}): ${errText}`);
    }

    const data = await response.json() as any;
    const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) throw new Error('Gemini TTS não retornou dados de áudio');

    const pcm = Buffer.from(inlineData.data, 'base64');

    // Gemini retorna PCM bruto (24 kHz, 16-bit, mono) — converte para WAV
    if ((inlineData.mimeType as string)?.includes('pcm') || !(inlineData.mimeType as string)?.includes('wav')) {
      return this.pcmToWav(pcm, 24000, 1, 16);
    }

    return pcm;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private pcmToWav(pcm: Buffer, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
    const dataLength = pcm.length;
    const wav = Buffer.alloc(44 + dataLength);

    wav.write('RIFF', 0);
    wav.writeUInt32LE(36 + dataLength, 4);
    wav.write('WAVE', 8);
    wav.write('fmt ', 12);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);                                           // PCM
    wav.writeUInt16LE(channels, 22);
    wav.writeUInt32LE(sampleRate, 24);
    wav.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28); // byte rate
    wav.writeUInt16LE(channels * (bitsPerSample / 8), 32);              // block align
    wav.writeUInt16LE(bitsPerSample, 34);
    wav.write('data', 36);
    wav.writeUInt32LE(dataLength, 40);
    pcm.copy(wav, 44);

    return wav;
  }

  private async uploadToGcs(buffer: Buffer, fileName: string, bucketName: string): Promise<void> {
    const file = this.storage.bucket(bucketName).file(`audios/${fileName}`);
    await file.save(buffer, { metadata: { contentType: 'audio/wav' } });
  }
}
