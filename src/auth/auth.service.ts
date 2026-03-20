import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, password: hashed },
    });

    if (dto.occupation || dto.objective || dto.techLevel) {
      await this.prisma.userProfile.create({
        data: {
          userId: user.id,
          occupation: dto.occupation,
          objective: dto.objective,
          techLevel: dto.techLevel,
        },
      });
    }

    const token = this.sign(user);
    return { token, user: { id: user.id, name: user.name, email: user.email } };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.password) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    const token = this.sign(user);
    return { token, user: { id: user.id, name: user.name, email: user.email } };
  }

  private sign(user: { id: string; email: string; name: string }) {
    return this.jwtService.sign({ sub: user.id, email: user.email, name: user.name });
  }
}
