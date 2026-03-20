import { Controller, Post, Get, Delete, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiCookieAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import express from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CardsService } from './cards.service';

@ApiTags('cards')
@ApiCookieAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('lessons/:lessonId/cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) { }

  @Post(':vocabularyId')
  @ApiOperation({ summary: 'Salvar palavra nos cards da lição' })
  @ApiParam({ name: 'lessonId', description: 'UUID da lição' })
  @ApiParam({ name: 'vocabularyId', description: 'UUID do vocabulário' })
  save(@Param('lessonId') lessonId: string, @Param('vocabularyId') vocabularyId: string, @Req() req: express.Request) {
    const user = req.user as { id: string };
    return this.cardsService.save(user.id, lessonId, vocabularyId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cards salvos do usuário para a lição' })
  @ApiParam({ name: 'lessonId', description: 'UUID da lição' })
  findByLesson(@Param('lessonId') lessonId: string, @Req() req: express.Request) {
    const user = req.user as { id: string };
    return this.cardsService.findByLesson(user.id, lessonId);
  }

  @Post(':id/learned')
  @ApiOperation({ summary: 'Marcar card como aprendido' })
  markLearned(@Param('id') id: string, @Req() req: express.Request) {
    const user = req.user as { id: string };
    return this.cardsService.markLearned(user.id, id);
  }

  @Post(':id/unlearned')
  @ApiOperation({ summary: 'Mover card de volta para não aprendido' })
  unmarkLearned(@Param('id') id: string, @Req() req: express.Request) {
    const user = req.user as { id: string };
    return this.cardsService.unmarkLearned(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover card' })
  remove(@Param('id') id: string, @Req() req: express.Request) {
    const user = req.user as { id: string };
    return this.cardsService.remove(user.id, id);
  }
}
