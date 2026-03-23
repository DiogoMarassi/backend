import { Controller, Get, Post, Delete, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiCookieAuth, ApiOperation } from '@nestjs/swagger';
import express from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ProfileService } from './profile.service';

@ApiTags('profile')
@ApiCookieAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('gemini-key/status')
  @ApiOperation({ summary: 'Verifica se o usuário tem chave Gemini salva' })
  async getKeyStatus(@Req() req: express.Request) {
    const user = req.user as { id: string };
    const hasKey = await this.profileService.hasGeminiKey(user.id);
    return { hasKey };
  }

  @Post('gemini-key')
  @ApiOperation({ summary: 'Salva a chave Gemini do usuário (criptografada)' })
  async saveKey(@Req() req: express.Request, @Body() body: { key: string }) {
    const user = req.user as { id: string };
    await this.profileService.saveGeminiKey(user.id, body.key.trim());
    return { ok: true };
  }

  @Delete('gemini-key')
  @ApiOperation({ summary: 'Remove a chave Gemini do usuário' })
  async deleteKey(@Req() req: express.Request) {
    const user = req.user as { id: string };
    await this.profileService.deleteGeminiKey(user.id);
    return { ok: true };
  }
}
