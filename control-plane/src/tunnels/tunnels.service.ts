import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tunnel } from '../entities/tunnel.entity';
import { User } from '../entities/user.entity';
import { CreateTunnelDto } from './dto/create-tunnel.dto';

@Injectable()
export class TunnelsService {
  constructor(
    @InjectRepository(Tunnel) private readonly tunnels: Repository<Tunnel>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  // POST /tunnels: reserve a subdomain, checking the caller's plan's
  // max_reserved_subdomains against their current tunnel count BEFORE
  // inserting (plan section 2.4, task 4 — this is the only place a
  // reservation limit gets enforced; see the plan-vs-numeric-limits design
  // note in section 2.3).
  async create(userId: string, dto: CreateTunnelDto) {
    const user = await this.users.findOne({ where: { id: userId }, relations: ['plan'] });
    if (!user) {
      throw new NotFoundException('user not found');
    }

    const currentCount = await this.tunnels.count({ where: { userId } });
    if (currentCount >= user.plan.maxReservedSubdomains) {
      throw new ForbiddenException(
        `plan "${user.plan.name}" allows at most ${user.plan.maxReservedSubdomains} reserved subdomain(s)`,
      );
    }

    const taken = await this.tunnels.findOne({ where: { subdomain: dto.subdomain } });
    if (taken) {
      throw new ConflictException('subdomain already taken');
    }

    return this.tunnels.save(
      this.tunnels.create({ userId, subdomain: dto.subdomain, status: 'reserved' }),
    );
  }

  async list(userId: string) {
    return this.tunnels.find({ where: { userId } });
  }

  async remove(userId: string, id: string) {
    const tunnel = await this.tunnels.findOne({ where: { id, userId } });
    if (!tunnel) {
      throw new NotFoundException('tunnel not found');
    }
    await this.tunnels.remove(tunnel);
  }
}
