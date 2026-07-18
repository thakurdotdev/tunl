import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Plan } from '../entities/plan.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
    private readonly jwt: JwtService,
  ) {}

  // Signup assigns plan_id by looking up the plan where is_default = true
  // (plan section 2.4, task 1) — never hardcode a plan id/name here.
  async signup(dto: SignupDto): Promise<{ accessToken: string }> {
    const existing = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException('email already registered');
    }

    const defaultPlan = await this.plans.findOne({ where: { isDefault: true } });
    if (!defaultPlan) {
      // Should never happen outside a broken migration/seed — fail loudly.
      throw new Error('no default plan configured');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.save(
      this.users.create({
        email: dto.email.toLowerCase(),
        passwordHash,
        planId: defaultPlan.id,
      }),
    );

    return { accessToken: this.issueToken(user) };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('invalid credentials');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('invalid credentials');
    }
    return { accessToken: this.issueToken(user) };
  }

  private issueToken(user: User): string {
    return this.jwt.sign({ sub: user.id, email: user.email });
  }
}
