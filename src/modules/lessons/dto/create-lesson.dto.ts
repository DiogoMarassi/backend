import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CefrLevel } from '@prisma/client';

export class CreateLessonDto {
  @ApiProperty({ example: 'Dia 2' })
  title: string;

  @ApiProperty({ enum: CefrLevel, example: CefrLevel.A1 })
  level: CefrLevel;

  @ApiProperty({ example: ['investigação', 'suspense'], type: [String] })
  themeWords: string[];

  @ApiPropertyOptional({ example: 'Il était une fois...' })
  storyContent?: string;

  @ApiPropertyOptional({ enum: ['gemini', 'ollama'], example: 'gemini' })
  provider?: 'gemini' | 'ollama';

  @ApiPropertyOptional({ enum: ['piper', 'gemini'], example: 'piper' })
  ttsProvider?: 'piper' | 'gemini';
}
