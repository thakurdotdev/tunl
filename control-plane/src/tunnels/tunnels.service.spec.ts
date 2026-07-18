import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TunnelsService } from './tunnels.service';
import { Tunnel } from '../entities/tunnel.entity';
import { User } from '../entities/user.entity';

// Plan section 2.4 task 4 test to fill in: plan-limit enforcement.
describe('TunnelsService', () => {
  let service: TunnelsService;
  const tunnelsRepo = { count: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), find: jest.fn(), remove: jest.fn() };
  const usersRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TunnelsService,
        { provide: getRepositoryToken(Tunnel), useValue: tunnelsRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
      ],
    }).compile();
    service = moduleRef.get(TunnelsService);
    jest.clearAllMocks();
  });

  it('rejects reservation once the plan limit is reached', async () => {
    usersRepo.findOne.mockResolvedValue({ id: 'u1', plan: { name: 'free', maxReservedSubdomains: 1 } });
    tunnelsRepo.count.mockResolvedValue(1);

    await expect(
      service.create('u1', { subdomain: 'myapp' }),
    ).rejects.toThrow();
  });

  it('allows reservation under the plan limit', async () => {
    usersRepo.findOne.mockResolvedValue({ id: 'u1', plan: { name: 'free', maxReservedSubdomains: 1 } });
    tunnelsRepo.count.mockResolvedValue(0);
    tunnelsRepo.findOne.mockResolvedValue(null); // subdomain not taken
    tunnelsRepo.create.mockImplementation((t) => t);
    tunnelsRepo.save.mockImplementation((t) => Promise.resolve({ id: 't1', ...t }));

    const result = await service.create('u1', { subdomain: 'myapp' });
    expect(result.subdomain).toBe('myapp');
  });
});
