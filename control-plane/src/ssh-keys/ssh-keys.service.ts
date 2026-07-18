import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { SshKey } from '../entities/ssh-key.entity';
import { CreateSshKeyDto } from './dto/create-ssh-key.dto';

@Injectable()
export class SshKeysService {
  constructor(@InjectRepository(SshKey) private readonly sshKeys: Repository<SshKey>) {}

  // POST /ssh-keys: validate it's a well-formed public key, compute the
  // fingerprint server-side (never trust a client-supplied one), store.
  // (plan section 2.4, task 3)
  async create(userId: string, dto: CreateSshKeyDto) {
    const fingerprint = this.computeFingerprint(dto.publicKey);

    const existing = await this.sshKeys.findOne({ where: { fingerprint } });
    if (existing) {
      throw new ConflictException('this key is already registered');
    }

    return this.sshKeys.save(
      this.sshKeys.create({ userId, publicKey: dto.publicKey, fingerprint, label: dto.label }),
    );
  }

  async list(userId: string) {
    return this.sshKeys.find({ where: { userId } });
  }

  async remove(userId: string, id: string) {
    const key = await this.sshKeys.findOne({ where: { id, userId } });
    if (!key) {
      throw new NotFoundException('key not found');
    }
    await this.sshKeys.remove(key);
  }

  // TODO: replace this placeholder with real OpenSSH public-key parsing
  // (e.g. via the `ssh2` or `sshpk` package) — this needs to actually
  // decode the key blob and reject malformed input, not just hash the raw
  // string. The SHA256 fingerprint format should match what OpenSSH's
  // `ssh-keygen -lf` prints so it's recognizable to users.
  private computeFingerprint(publicKey: string): string {
    const trimmed = publicKey.trim();
    if (!trimmed.startsWith('ssh-')) {
      throw new UnprocessableEntityException('malformed public key');
    }
    const hash = crypto.createHash('sha256').update(trimmed).digest('base64');
    return `SHA256:${hash.replace(/=+$/, '')}`;
  }
}
