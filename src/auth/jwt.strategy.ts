import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

const cookieExtractor = (req: Request): string | null => {
  return req?.cookies?.['jwt'] ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'easy_langue_secret',
    });
  }

  validate(payload: { sub: string; email: string; name: string }) {
    return { id: payload.sub, email: payload.email, name: payload.name };
  }
}
