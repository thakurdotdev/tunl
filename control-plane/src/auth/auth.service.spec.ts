import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { Plan } from '../entities/plan.entity';

// Plan section 2.4 task 1 tests to fill in:
//   - signup creates a user with the default plan
//   - login returns a valid JWT
//   - protected route rejects missing/invalid token (belongs in an e2e spec)
describe('AuthService', () => {
  let service: AuthService;
  const usersRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  const plansRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Plan), useValue: plansRepo },
        { provide: JwtService, useValue: { sign: () => 'fake-jwt' } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    jest.clearAllMocks();
  });

  it('signup assigns the default plan to a new user', async () => {
    usersRepo.findOne.mockResolvedValue(null);
    plansRepo.findOne.mockResolvedValue({ id: 'plan-1', isDefault: true });
    usersRepo.create.mockImplementation((u) => u);
    usersRepo.save.mockImplementation((u) => Promise.resolve({ id: 'user-1', ...u }));

    const result = await service.signup({ email: 'a@example.com', password: 'password123' });

    expect(usersRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ planId: 'plan-1' }),
    );
    expect(result.accessToken).toBe('fake-jwt');
  });

  it('signup rejects an already-registered email', async () => {
    usersRepo.findOne.mockResolvedValue({ id: 'existing' });
    await expect(
      service.signup({ email: 'a@example.com', password: 'password123' }),
    ).rejects.toThrow();
  });
});
