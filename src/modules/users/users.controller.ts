import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @ApiOperation({ summary: 'Listar todos os usuários' })
  @ApiResponse({ status: 200, description: 'Lista de usuários com streak.' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado com streak e progresso.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post(':id/complete-lesson')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Completar uma lição e atualizar streak' })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiBody({ schema: { example: { lessonId: 'uuid-da-licao' } } })
  @ApiResponse({ status: 201, description: 'Streak atualizada.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  completeLesson(
    @Param('id') userId: string,
    @Body('lessonId') lessonId: string,
  ) {
    return this.usersService.completeLesson(userId, lessonId);
  }
}
