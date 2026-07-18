import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

// Plan section 5: at least one e2e test per module hitting a real test
// Postgres (via docker-compose's test profile or testcontainers).
// This is a starting skeleton — requires DATABASE_URL pointed at a running
// test database before it will pass.
describe('AppModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects signup with an invalid email', () => {
    return request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'not-an-email', password: 'password123' })
      .expect(400);
  });
});
