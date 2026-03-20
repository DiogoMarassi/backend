import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  create(dto: CreateUserDto) {
    return this.prisma.user.create({
      data: { name: dto.name, email: dto.email },
    });
  }

  findAll() {
    return this.prisma.user.findMany({ include: { streak: true } });
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { streak: true },
    });
    if (!user) throw new NotFoundException('E-mail não encontrado');
    return user;
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { streak: true, progress: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async completeLesson(userId: string, lessonId: string) {
    await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId },
      update: { completedAt: new Date() },
    });

    const streak = await this.prisma.streak.findUnique({ where: { userId } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!streak) {
      return this.prisma.streak.create({
        data: { userId, currentStreak: 1, highestStreak: 1, lastActivityDate: today },
      });
    }

    const lastActivity = new Date(streak.lastActivityDate);
    lastActivity.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
      (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 1) {
      const newStreak = streak.currentStreak + 1;
      return this.prisma.streak.update({
        where: { userId },
        data: {
          currentStreak: newStreak,
          highestStreak: Math.max(newStreak, streak.highestStreak),
          lastActivityDate: today,
        },
      });
    } else if (diffDays > 1) {
      return this.prisma.streak.update({
        where: { userId },
        data: { currentStreak: 1, lastActivityDate: today },
      });
    }

    return streak;
  }
}
