import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiCookieAuth, ApiOperation } from '@nestjs/swagger';
import express from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CardsService } from './cards.service';

@ApiTags('cards')
@ApiCookieAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('cards')
export class GlobalCardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os cards salvos do usuário' })
  findAll(@Req() req: express.Request) {
    const user = req.user as { id: string };
    return this.cardsService.findAllByUser(user.id);
  }

  @Post('manual')
  @ApiOperation({ summary: 'Adicionar palavra manualmente ao vocabulário' })
  saveManual(@Req() req: express.Request, @Body() body: { original: string; translation: string; lessonId?: string }) {
    const user = req.user as { id: string };
    return this.cardsService.saveManual(user.id, body.original, body.translation, body.lessonId);
  }

  @Post(':id/learned')
  @ApiOperation({ summary: 'Marcar card como aprendido (sem lessonId)' })
  markLearned(@Param('id') id: string, @Req() req: express.Request) {
    const user = req.user as { id: string };
    return this.cardsService.markLearned(user.id, id);
  }

  @Post(':id/unlearned')
  @ApiOperation({ summary: 'Mover card de volta para não aprendido (sem lessonId)' })
  unmarkLearned(@Param('id') id: string, @Req() req: express.Request) {
    const user = req.user as { id: string };
    return this.cardsService.unmarkLearned(user.id, id);
  }
}
