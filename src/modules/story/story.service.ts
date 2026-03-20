import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { removeStopwords, fra } from 'stopword';
import { jsonrepair } from 'jsonrepair';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'mistral';

export interface ExtractedWord {
    original: string;
    translation: string;
}

@Injectable()
export class StoryService {
    private readonly logger = new Logger(StoryService.name);

    async generateStory(level: string, themes: string[]): Promise<string> {
        var nivel = 'élémentaire';
        console.log("Level recebido para geração de história:", level);

        if (level === 'A2') nivel = 'élémentaire';
        else if (level === 'B1') nivel = 'intermédiaire';
        else if (level === 'B2') nivel = 'intermédiaire avancé';
        else if (level === 'C1') nivel = 'avancé';
        else if (level === 'C2') nivel = 'expérimenté'; // ou 'bilingue'


        const prompt = `Agis comme un professeur de français natif et créatif.
Écris une histoire de 3 à 4 paragraphes en français pour un étudiant de niveau ${level} (CEFR).
Les mots suivants définissent le THÈME et le contexte de l'histoire : ${themes.join(', ')}. 
Tu n'as pas besoin d'utiliser ces mots exacts dans le texte, sers-t'en uniquement comme inspiration pour le scénario.

Règles strictes :
- Utilise exclusivement le vocabulaire et la grammaire adaptés au niveau ${level}.
- Ne fournis AUCUNE traduction, explication, ni salutation.
- Retourne UNIQUEMENT le texte de l'histoire en français.`;

        return this.callOllama(prompt);
    }

    async extractWords(content: string): Promise<ExtractedWord[]> {
        // 1. Tokenização determinística — só letras francesas, mínimo 3 caracteres
        const tokens = content
            .toLowerCase()
            .match(/(?<![a-zàâçéèêëîïôûùüÿœæ])[a-zàâçéèêëîïôûùüÿœæ]{3,}(?![a-zàâçéèêëîïôûùüÿœæ])/g) ?? [];

        // 2. Remove stop words francesas (déterminants, prépositions, pronoms...)
        const meaningful = removeStopwords(tokens, fra);

        // 3. Deduplica mantendo ordem de aparição
        const unique = [...new Set(meaningful)];

        if (unique.length === 0) return [];

        // 4. Ollama só traduz — prompt simples e determinístico
        const prompt = `You are an expert translator. Translate each French word below into Brazilian Portuguese.
You MUST return ONLY a valid JSON array. Do not include markdown blocks, backticks, greetings, or any conversational text.

Exact format required:
[{"original": "mot", "translation": "palavra"}]

Words to translate: ${unique.join(', ')}`;

        const raw = await this.callOllama(prompt);

        try {
            // Isola o trecho que parece um array JSON e tenta reparar
            const match = raw.match(/\[[\s\S]*/);
            const jsonStr = match ? match[0] : raw;
            const repaired = jsonrepair(jsonStr);
            const parsed = JSON.parse(repaired) as ExtractedWord[];
            return parsed.filter(
                (w) => w && typeof w.original === 'string' && typeof w.translation === 'string',
            );
        } catch (err) {
            this.logger.error('Falha ao parsear traduções mesmo após repair:', raw);
            throw new InternalServerErrorException('Falha ao traduzir palavras');
        }
    }

    private async callOllama(prompt: string): Promise<string> {
        let res: Response;
        try {
            res = await fetch(`${OLLAMA_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
            });
        } catch {
            throw new InternalServerErrorException(
                'Não foi possível conectar ao Ollama. Verifique se ele está rodando em ' + OLLAMA_URL,
            );
        }

        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new InternalServerErrorException(`Ollama retornou erro ${res.status}: ${body}`);
        }

        const data = await res.json() as { response: string };
        return data.response.trim();
    }
}
