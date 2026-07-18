import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  // GET /me returns profile including plan name and max_reserved_subdomains
  // (plan section 2.4, task 2).
  async getProfile(userId: string) {
    const user = await this.users.findOne({ where: { id: userId }, relations: ['plan'] });
    if (!user) {
      throw new NotFoundException('user not found');
    }
    return {
      id: user.id,
      email: user.email,
      plan: {
        name: user.plan.name,
        maxReservedSubdomains: user.plan.maxReservedSubdomains,
      },
      createdAt: user.createdAt,
    };
  }
}
