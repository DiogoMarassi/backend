import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiCookieAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { StoryService, ExtractedWord } from './story.service';

class GenerateStoryDto {
    level: string;
    themeWords: string[];
}

class ExtractWordsDto {
    content: string;
}

@ApiTags('story')
@ApiCookieAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('story')
export class StoryController {
    constructor(private readonly storyService: StoryService) {}

    @Post('generate')
    @ApiOperation({ summary: 'Gera uma história em francês com a IA' })
    async generate(@Body() dto: GenerateStoryDto): Promise<{ content: string }> {
        const content = await this.storyService.generateStory(dto.level, dto.themeWords);
        return { content };
    }

    @Post('extract-words')
    @ApiOperation({ summary: 'Extrai palavras e expressões importantes do texto com tradução' })
    async extractWords(@Body() dto: ExtractWordsDto): Promise<ExtractedWord[]> {
        return this.storyService.extractWords(dto.content);
    }
}
