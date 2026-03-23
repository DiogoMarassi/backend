import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type AiProvider = 'gemini' | 'ollama';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  async generate(prompt: string, provider: AiProvider, apiKey?: string): Promise<string> {
    if (provider === 'gemini') {
      return this.callGemini(prompt, apiKey);
    }
    return this.callOllama(prompt);
  }

  private async callOllama(prompt: string): Promise<string> {
    const url = process.env.OLLAMA_URL ?? 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL ?? 'mistral-nemo';

    let res: Response;
    try {
      res = await fetch(`${url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false }),
      });
    } catch {
      throw new InternalServerErrorException(
        `Não foi possível conectar ao Ollama em ${url}. Verifique se ele está rodando.`,
      );
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new InternalServerErrorException(`Ollama retornou erro ${res.status}: ${body}`);
    }

    const data = (await res.json()) as { response: string };
    return data.response.trim();
  }

  private async callGemini(prompt: string, apiKey?: string): Promise<string> {
    const key = apiKey ?? process.env.GEMINI_API_KEY;
    if (!key) throw new InternalServerErrorException('Nenhuma chave Gemini configurada. Adicione sua chave em Configurações ou defina GEMINI_API_KEY no servidor.');

    const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

    try {
      const genAI = new GoogleGenerativeAI(key);
      const gemini = genAI.getGenerativeModel({ model });
      const result = await gemini.generateContent(prompt);
      return result.response.text().trim();
    } catch (err: any) {
      this.logger.error('Erro ao chamar Gemini:', err?.message);
      throw new InternalServerErrorException(`Erro na API do Gemini: ${err?.message}`);
    }
  }
}
