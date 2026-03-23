import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { removeStopwords, fra } from 'stopword';
import { jsonrepair } from 'jsonrepair';
import { LlmService, AiProvider } from '../llm/llm.service';

export interface ExtractedWord {
    original: string;
    translation: string;
}

@Injectable()
export class StoryService {
    private readonly logger = new Logger(StoryService.name);

    constructor(private readonly llm: LlmService) { }

    async generateStory(
        level: string,
        provider: AiProvider,
        options: { themeWords?: string[]; vocabularyWords?: string[] },
        apiKey?: string,
    ): Promise<string> {
        const wordsInstruction = options.vocabularyWords?.length
            ? `Tu DOIS utiliser les mots suivants dans l'histoire, de manière naturelle : ${options.vocabularyWords.join(', ')}.
Ces mots doivent apparaître dans le texte tels quels ou sous une forme fléchie.`
            : `Les mots suivants définissent le THÈME et le contexte de l'histoire : ${(options.themeWords ?? []).join(', ')}.
Tu n'as pas besoin d'utiliser ces mots exacts dans le texte, sers-t'en uniquement comme inspiration pour le scénario.`;

        const prompt = `Agis comme un professeur de français natif et créatif.
Écris une histoire en français pour un étudiant de niveau ${level} (CEFR).
${wordsInstruction}

Règles strictes :
- La longueur de l'histoire doit être d'environ 1000 caractères (espaces compris).
- Divise le texte en plusieurs paragraphes bien structurés pour faciliter la lecture.
- Utilise exclusivement le vocabulaire et la grammaire adaptés au niveau ${level}.
- Ne fournis AUCUNE traduction, explication, ni salutation.
- Retourne UNIQUEMENT le texte de l'histoire en français.`;

        return this.llm.generate(prompt, provider, apiKey);
    }

    async extractWords(content: string, provider: AiProvider, apiKey?: string): Promise<ExtractedWord[]> {
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

        const raw = await this.llm.generate(prompt, provider, apiKey);

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

}
