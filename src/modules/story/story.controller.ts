import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiCookieAuth, ApiOperation } from '@nestjs/swagger';
import express from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { StoryService, ExtractedWord } from './story.service';
import { ProfileService } from '../profile/profile.service';

class GenerateStoryDto {
    level: string;
    provider: 'gemini' | 'ollama';
    themeWords?: string[];
    vocabularyWords?: string[];
}

class ExtractWordsDto {
    content: string;
    provider: 'gemini' | 'ollama';
}

@ApiTags('story')
@ApiCookieAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('story')
export class StoryController {
    constructor(
        private readonly storyService: StoryService,
        private readonly profileService: ProfileService,
    ) {}

    @Post('generate')
    @ApiOperation({ summary: 'Gera uma história em francês com a IA' })
    async generate(@Body() dto: GenerateStoryDto, @Req() req: express.Request): Promise<{ content: string }> {
        const user = req.user as { id: string };
        const apiKey = await this.profileService.getDecryptedGeminiKey(user.id);
        const content = await this.storyService.generateStory(dto.level, dto.provider, {
            themeWords: dto.themeWords,
            vocabularyWords: dto.vocabularyWords,
        }, apiKey);
        return { content };
    }

    @Post('extract-words')
    @ApiOperation({ summary: 'Extrai palavras e expressões importantes do texto com tradução' })
    async extractWords(@Body() dto: ExtractWordsDto): Promise<ExtractedWord[]> {
        return this.storyService.extractWords(dto.content, dto.provider);
    }
}
