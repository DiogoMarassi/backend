import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiCookieAuth } from '@nestjs/swagger';
import express from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';

@ApiTags('lessons')
@ApiCookieAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) { }

  @Post()
  @ApiOperation({ summary: 'Criar nova lição' })
  create(@Body() dto: CreateLessonDto, @Req() req: express.Request) {
    const user = req.user as { id: string };
    return this.lessonsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar lições do usuário autenticado' })
  findAll(@Req() req: express.Request) {
    const user = req.user as { id: string };
    return this.lessonsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar lição por ID' })
  @ApiParam({ name: 'id', description: 'UUID da lição' })
  findOne(@Param('id') id: string, @Req() req: express.Request) {
    const user = req.user as { id: string };
    return this.lessonsService.findOne(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover lição' })
  @ApiParam({ name: 'id', description: 'UUID da lição' })
  remove(@Param('id') id: string, @Req() req: express.Request) {
    const user = req.user as { id: string };
    return this.lessonsService.remove(id, user.id);
  }
}
