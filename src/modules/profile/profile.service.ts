import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/encryption.service';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async hasGeminiKey(userId: string): Promise<boolean> {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    return !!profile?.geminiApiKey;
  }

  async saveGeminiKey(userId: string, key: string): Promise<void> {
    const encrypted = this.encryption.encrypt(key);
    await this.prisma.userProfile.upsert({
      where: { userId },
      update: { geminiApiKey: encrypted },
      create: { userId, geminiApiKey: encrypted },
    });
  }

  async deleteGeminiKey(userId: string): Promise<void> {
    await this.prisma.userProfile.updateMany({
      where: { userId },
      data: { geminiApiKey: null },
    });
  }

  async getDecryptedGeminiKey(userId: string): Promise<string | undefined> {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile?.geminiApiKey) return undefined;
    return this.encryption.decrypt(profile.geminiApiKey);
  }
}
