import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CardsService {
  constructor(private prisma: PrismaService) {}

  async save(userId: string, lessonId: string, vocabularyId: string) {
    const vocab = await this.prisma.vocabulary.findUnique({ where: { id: vocabularyId } });
    if (!vocab) throw new NotFoundException('Palavra não encontrada');

    return this.prisma.userCard.upsert({
      where: { userId_vocabularyId_lessonId: { userId, vocabularyId, lessonId } },
      update: {},
      create: { userId, vocabularyId, lessonId },
    });
  }

  async findByLesson(userId: string, lessonId: string) {
    const cards = await this.prisma.userCard.findMany({
      where: { userId, lessonId },
      include: { vocabulary: true, lesson: { select: { title: true } } },
      orderBy: { savedAt: 'asc' },
    });
    return cards.map((c) => ({
      id: c.id,
      lessonId: c.lessonId,
      lessonTitle: c.lesson?.title ?? '',
      savedAt: c.savedAt,
      learned: c.learned,
      original: c.vocabulary.original,
      translation: c.vocabulary.translation,
    }));
  }

  async findAllByUser(userId: string) {
    const cards = await this.prisma.userCard.findMany({
      where: { userId },
      include: { vocabulary: true, lesson: { select: { title: true } } },
      orderBy: { savedAt: 'asc' },
    });
    return cards.map((c) => ({
      id: c.id,
      lessonId: c.lessonId,
      lessonTitle: c.lesson?.title ?? '',
      savedAt: c.savedAt,
      learned: c.learned,
      original: c.vocabulary.original,
      translation: c.vocabulary.translation,
    }));
  }

  async markLearned(userId: string, id: string) {
    const card = await this.prisma.userCard.findUnique({ where: { id } });
    if (!card || card.userId !== userId) throw new NotFoundException('Card não encontrado');
    return this.prisma.userCard.update({ where: { id }, data: { learned: true } });
  }

  async unmarkLearned(userId: string, id: string) {
    const card = await this.prisma.userCard.findUnique({ where: { id } });
    if (!card || card.userId !== userId) throw new NotFoundException('Card não encontrado');
    return this.prisma.userCard.update({ where: { id }, data: { learned: false } });
  }

  async remove(userId: string, id: string) {
    const card = await this.prisma.userCard.findUnique({ where: { id } });
    if (!card || card.userId !== userId) throw new NotFoundException('Card não encontrado');
    return this.prisma.userCard.delete({ where: { id } });
  }

  async findVocabularyByUser(userId: string) {
    const cards = await this.prisma.userCard.findMany({
      where: { userId },
      include: {
        vocabulary: true,
        lesson: { select: { id: true, title: true } },
      },
      orderBy: { savedAt: 'asc' },
    });

    // Group by vocabularyId
    const map = new Map<string, {
      vocabularyId: string;
      original: string;
      translation: string;
      learned: number;
      total: number;
      lessons: { id: string; title: string }[];
    }>();

    for (const c of cards) {
      const existing = map.get(c.vocabularyId);
      if (existing) {
        existing.total += 1;
        if (c.learned) existing.learned += 1;
        if (c.lessonId && c.lesson && !existing.lessons.find((l) => l.id === c.lessonId)) {
          existing.lessons.push({ id: c.lesson.id, title: c.lesson.title });
        }
      } else {
        map.set(c.vocabularyId, {
          vocabularyId: c.vocabularyId,
          original: c.vocabulary.original,
          translation: c.vocabulary.translation,
          learned: c.learned ? 1 : 0,
          total: 1,
          lessons: c.lessonId && c.lesson ? [{ id: c.lesson.id, title: c.lesson.title }] : [],
        });
      }
    }

    return Array.from(map.values());
  }

  async saveManual(userId: string, original: string, translation: string, lessonId?: string) {
    const vocab = await this.prisma.vocabulary.upsert({
      where: { original: original.toLowerCase().trim() },
      update: {},
      create: { original: original.toLowerCase().trim(), translation: translation.trim() },
    });
    const existing = await this.prisma.userCard.findFirst({
      where: { userId, vocabularyId: vocab.id, lessonId: lessonId ?? null },
    });
    if (existing) return existing;
    return this.prisma.userCard.create({
      data: { userId, vocabularyId: vocab.id, lessonId: lessonId ?? null },
    });
  }

  async removeVocabularyWord(userId: string, vocabularyId: string) {
    await this.prisma.userCard.deleteMany({ where: { userId, vocabularyId } });
    return { ok: true };
  }
}
