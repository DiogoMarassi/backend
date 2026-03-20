import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { GlobalCardsController } from './global-cards.controller';
import { UserVocabularyController } from './user-vocabulary.controller';

@Module({
  controllers: [CardsController, GlobalCardsController, UserVocabularyController],
  providers: [CardsService],
})
export class CardsModule {}
