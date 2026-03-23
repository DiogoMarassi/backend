import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './auth/auth.module';
import { StoryModule } from './modules/story/story.module';
import { CardsModule } from './modules/cards/cards.module';
import { ProfileModule } from './modules/profile/profile.module';

@Module({
  imports: [PrismaModule, LessonsModule, UsersModule, AuthModule, StoryModule, CardsModule, ProfileModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
