import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AdminController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/admin/users (GET) - Unauthenticated Reject 401', () => {
    return request(app.getHttpServer())
      .get('/admin/users')
      .expect(401);
  });

  it('/admin/users (GET) - Invalid Token Mock Reject 401', () => {
    return request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('/admin/dean/approve-exception (POST) - Empty request reject 401', () => {
    return request(app.getHttpServer())
      .post('/admin/dean/approve-exception')
      .send({ exceptionId: 'test-id', decision: 'approved' })
      .expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
