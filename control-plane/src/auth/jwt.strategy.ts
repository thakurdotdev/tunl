import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'changeme-jwt-secret',
    });
  }

  async validate(payload: { sub: string; email: string }) {
    // Attached to req.user by Nest's passport integration.
    return { userId: payload.sub, email: payload.email };
  }
}
