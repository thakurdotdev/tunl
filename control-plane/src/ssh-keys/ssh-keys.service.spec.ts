import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SshKeysService } from './ssh-keys.service';
import { SshKey } from '../entities/ssh-key.entity';

// Plan section 2.4 task 3 tests to fill in:
//   - duplicate fingerprint rejected
//   - malformed key rejected
//   - fingerprint computed correctly against a known test vector
//     (swap in a real OpenSSH-format fingerprint once computeFingerprint
//     uses actual key parsing instead of the SHA256(raw-string) placeholder)
describe('SshKeysService', () => {
  let service: SshKeysService;
  const repo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), find: jest.fn(), remove: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [SshKeysService, { provide: getRepositoryToken(SshKey), useValue: repo }],
    }).compile();
    service = moduleRef.get(SshKeysService);
    jest.clearAllMocks();
  });

  it('rejects a key with no matching existing fingerprint check bypass', async () => {
    repo.findOne.mockResolvedValue({ id: 'existing-key' });
    await expect(
      service.create('user-1', { publicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...', label: 'laptop' }),
    ).rejects.toThrow();
  });

  it('rejects a malformed key', async () => {
    await expect(
      service.create('user-1', { publicKey: 'not-a-real-key', label: '' }),
    ).rejects.toThrow();
  });
});
