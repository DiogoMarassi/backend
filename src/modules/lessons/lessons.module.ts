import { Module } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';
import { AudioModule } from '../audio/audio.module';
import { StoryModule } from '../story/story.module';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [AudioModule, StoryModule, ProfileModule],
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
