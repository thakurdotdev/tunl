import { Body, Controller, HttpCode, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SshKey } from '../entities/ssh-key.entity';
import { InternalAuthGuard } from './internal-auth.guard';
import { ValidateKeyRequestDto, UsageEventDto } from './dto';

// Endpoints only the Go server calls — not user-facing.
// POST /internal/validate-key and POST /internal/usage, per plan section 2.3.
@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalController {
  constructor(@InjectRepository(SshKey) private readonly sshKeys: Repository<SshKey>) {}

  @Post('validate-key')
  async validateKey(@Body() dto: ValidateKeyRequestDto) {
    const key = await this.sshKeys.findOne({
      where: { fingerprint: dto.fingerprint },
      relations: ['user', 'user.plan'],
    });
    if (!key) {
      throw new NotFoundException();
    }

    // TODO(plan section 1.2 design note on allowedSubdomain): today this
    // returns whichever single reserved subdomain the user has, if any.
    // If a future plan allows more than one reserved subdomain per
    // account, this needs the {fingerprint, requestedSubdomain} contract
    // change described in the plan — don't build that now.
    return {
      userId: key.user.id,
      allowedSubdomain: '', // TODO: look up the user's reserved tunnels.tunnels row
      plan: key.user.plan.name,
    };
  }

  @Post('usage')
  @HttpCode(204)
  async usage(@Body() dto: UsageEventDto) {
    // Stub: just log it for now, no billing logic yet (plan section 2.3/2.5).
    // eslint-disable-next-line no-console
    console.log('usage event', dto);
  }
}
