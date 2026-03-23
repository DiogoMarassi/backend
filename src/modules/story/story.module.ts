import { Module } from '@nestjs/common';
import { StoryService } from './story.service';
import { StoryController } from './story.controller';
import { LlmModule } from '../llm/llm.module';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [LlmModule, ProfileModule],
  controllers: [StoryController],
  providers: [StoryService],
  exports: [StoryService],
})
export class StoryModule {}
