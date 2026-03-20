import { Controller, Get, Delete, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiCookieAuth, ApiOperation } from '@nestjs/swagger';
import express from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CardsService } from './cards.service';

@ApiTags('vocabulary')
@ApiCookieAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('vocabulary')
export class UserVocabularyController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar vocabulário agrupado do usuário' })
  findAll(@Req() req: express.Request) {
    const user = req.user as { id: string };
    return this.cardsService.findVocabularyByUser(user.id);
  }

  @Delete(':vocabularyId')
  @ApiOperation({ summary: 'Remover palavra do vocabulário do usuário' })
  remove(@Param('vocabularyId') vocabularyId: string, @Req() req: express.Request) {
    const user = req.user as { id: string };
    return this.cardsService.removeVocabularyWord(user.id, vocabularyId);
  }
}
