import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AudioService } from '../audio/audio.service';
import { StoryService } from '../story/story.service';
import { CreateLessonDto } from './dto/create-lesson.dto';

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);

  constructor(
    private prisma: PrismaService,
    private audio: AudioService,
    private story: StoryService,
  ) {}

  async create(dto: CreateLessonDto, userId: string) {
    const lesson = await this.prisma.lesson.create({
      data: {
        userId,
        title: dto.title,
        level: dto.level,
        themeWords: dto.themeWords ?? [],
      },
    });

    if (dto.storyContent) {
      try {
        const [audioUrl, extractedWords] = await Promise.all([
          this.audio.generateAudio(dto.storyContent, lesson.id),
          this.story.extractWords(dto.storyContent),
        ]);

        const createdStory = await this.prisma.story.create({
          data: { lessonId: lesson.id, content: dto.storyContent, audioUrl },
        });

        for (const w of extractedWords) {
          const vocab = await this.prisma.vocabulary.upsert({
            where: { original: w.original.toLowerCase() },
            update: {},
            create: { original: w.original.toLowerCase(), translation: w.translation },
          });
          await this.prisma.storyWord.upsert({
            where: { storyId_vocabularyId: { storyId: createdStory.id, vocabularyId: vocab.id } },
            update: {},
            create: { storyId: createdStory.id, vocabularyId: vocab.id },
          });
        }
      } catch (err) {
        this.logger.error('Falha ao processar história:', err);
        throw err;
      }
    }

    return this.prisma.lesson.findUnique({
      where: { id: lesson.id },
      include: { story: { include: { words: true } } },
    });
  }

  async findAll(userId: string) {
    const lessons = await this.prisma.lesson.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        story: true,
        userCards: { where: { userId } },
      },
    });
    return lessons.map(({ userCards, ...lesson }) => ({
      ...lesson,
      cardStats: {
        total: userCards.length,
        learned: userCards.filter((c) => c.learned).length,
      },
    }));
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.lesson.delete({ where: { id } });
  }

  async findOne(id: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        story: {
          include: { words: { include: { vocabulary: true } } },
        },
      },
    });
    if (!lesson || lesson.userId !== userId) throw new NotFoundException('Lição não encontrada');

    // Flatten StoryWord → Vocabulary para o frontend receber { id, original, translation }
    return {
      ...lesson,
      story: lesson.story
        ? {
            ...lesson.story,
            words: lesson.story.words.map((sw) => ({
              id: sw.vocabularyId,
              original: sw.vocabulary.original,
              translation: sw.vocabulary.translation,
            })),
          }
        : null,
    };
  }
}
