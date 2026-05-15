import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import type { App } from 'supertest/types';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { AdminController } from '../src/admin/admin.controller';
import { AdminService } from '../src/admin/admin.service';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { DailyPlansController } from '../src/daily-plans/daily-plans.controller';
import { DailyPlansService } from '../src/daily-plans/daily-plans.service';
import { LongTasksController } from '../src/long-tasks/long-tasks.controller';
import { LongTasksService } from '../src/long-tasks/long-tasks.service';
import { ProfileController } from '../src/profile/profile.controller';
import { ProfileService } from '../src/profile/profile.service';
import { TodayTasksController } from '../src/today-tasks/today-tasks.controller';
import { TodayTasksService } from '../src/today-tasks/today-tasks.service';

describe('新接口返回字段（e2e）', () => {
  let app: INestApplication<App>;

  const user = {
    id: '1',
    email: 'user@example.com',
    role: 'user',
    username: 'tester',
  };

  const admin = {
    id: '2',
    email: 'admin@example.com',
    role: 'admin',
    username: 'admin',
  };

  const jwtAuthGuardMock = {
    canActivate: (context: {
      switchToHttp: () => {
        getRequest: () => {
          headers: { authorization?: string };
          user?: typeof user;
        };
      };
    }) => {
      const request = context.switchToHttp().getRequest();
      const header = request.headers.authorization;
      request.user = header?.includes('admin-token') ? admin : user;
      return true;
    },
  };

  const todayTasksServiceMock = {
    getTodayTasks: jest.fn(),
    createTodayTask: jest.fn(),
    clearTodayTasks: jest.fn(),
    generateTodayTasks: jest.fn(),
    updateTodayTask: jest.fn(),
    deleteTodayTask: jest.fn(),
  };

  const longTasksServiceMock = {
    getLongTasks: jest.fn(),
    createLongTask: jest.fn(),
    updateLongTask: jest.fn(),
    deleteLongTask: jest.fn(),
    clearLongTasks: jest.fn(),
    generateLongTasks: jest.fn(),
  };

  const dailyPlansServiceMock = {
    getDailyPlans: jest.fn(),
    createDailyPlan: jest.fn(),
    updateDailyPlan: jest.fn(),
    deleteDailyPlan: jest.fn(),
    generateDailyPlans: jest.fn(),
  };

  const profileServiceMock = {
    getProfile: jest.fn(),
    getProfileStats: jest.fn(),
    updateProfile: jest.fn(),
    uploadAvatar: jest.fn(),
    updateAiPrompt: jest.fn(),
    updateAiConfig: jest.fn(),
  };

  const adminServiceMock = {
    getUsers: jest.fn(),
    getUserDetail: jest.fn(),
    getUserStats: jest.fn(),
  };

  const getEnvelope = (response: Response) =>
    response.body as {
      code: number;
      message: string;
      data: Record<string, unknown>;
    };

  const getData = (response: Response) => getEnvelope(response).data;

  const getListItem = (response: Response) => {
    const data = getData(response);
    const list = data.list as Array<Record<string, unknown>>;
    return list[0];
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        TodayTasksController,
        LongTasksController,
        DailyPlansController,
        ProfileController,
        AdminController,
      ],
      providers: [
        { provide: TodayTasksService, useValue: todayTasksServiceMock },
        { provide: LongTasksService, useValue: longTasksServiceMock },
        { provide: DailyPlansService, useValue: dailyPlansServiceMock },
        { provide: ProfileService, useValue: profileServiceMock },
        { provide: AdminService, useValue: adminServiceMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtAuthGuardMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /plan/today-tasks 返回字段与文档一致', async () => {
    todayTasksServiceMock.getTodayTasks.mockResolvedValue({
      list: [
        {
          id: 1,
          title: '任务1',
          description: '描述1',
          priority: 'high',
          isCompleted: false,
          taskDate: '2026-05-08',
          originalDate: '2026-05-08',
          carryOverCount: 0,
          sortOrder: 0,
          source: 'manual',
          createdAt: '2026-05-08T10:00:00.000Z',
          updatedAt: '2026-05-08T10:00:00.000Z',
        },
      ],
      total: 1,
    });

    const response = await request(app.getHttpServer())
      .get('/plan/today-tasks')
      .set('Authorization', 'Bearer user-token')
      .expect(200);

    expect(Object.keys(getData(response))).toEqual(['list', 'total']);
    expect(Object.keys(getListItem(response))).toEqual([
      'id',
      'title',
      'description',
      'priority',
      'isCompleted',
      'taskDate',
      'originalDate',
      'carryOverCount',
      'sortOrder',
      'source',
      'createdAt',
      'updatedAt',
    ]);
  });

  it('POST /plan/today-tasks 返回字段与文档一致', async () => {
    todayTasksServiceMock.createTodayTask.mockResolvedValue({
      id: 1,
      title: '任务1',
      description: '描述1',
      priority: 'high',
      isCompleted: false,
      taskDate: '2026-05-08',
      originalDate: '2026-05-08',
      carryOverCount: 0,
      sortOrder: 0,
      source: 'manual',
    });

    const response = await request(app.getHttpServer())
      .post('/plan/today-tasks')
      .set('Authorization', 'Bearer user-token')
      .send({ title: '任务1', priority: 'high' })
      .expect(201);

    expect(Object.keys(getData(response))).toEqual([
      'id',
      'title',
      'description',
      'priority',
      'isCompleted',
      'taskDate',
      'originalDate',
      'carryOverCount',
      'sortOrder',
      'source',
    ]);
  });

  it('PUT /plan/today-tasks/:id 返回字段与文档一致', async () => {
    todayTasksServiceMock.updateTodayTask.mockResolvedValue({
      id: 1,
      title: '任务1',
      description: '描述1',
      priority: 'high',
      isCompleted: true,
      taskDate: '2026-05-08',
      originalDate: '2026-05-08',
      carryOverCount: 0,
      sortOrder: 1,
      source: 'manual',
      updatedAt: '2026-05-08T12:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .put('/plan/today-tasks/1')
      .set('Authorization', 'Bearer user-token')
      .send({ isCompleted: true })
      .expect(200);

    expect(Object.keys(getData(response))).toEqual([
      'id',
      'title',
      'description',
      'priority',
      'isCompleted',
      'taskDate',
      'originalDate',
      'carryOverCount',
      'sortOrder',
      'source',
      'updatedAt',
    ]);
  });

  it('DELETE /plan/today-tasks/:id 返回字段与文档一致', async () => {
    todayTasksServiceMock.deleteTodayTask.mockResolvedValue({ id: 1 });

    const response = await request(app.getHttpServer())
      .delete('/plan/today-tasks/1')
      .set('Authorization', 'Bearer user-token')
      .expect(200);

    expect(Object.keys(getData(response))).toEqual(['id']);
  });

  it('POST /plan/today-tasks/clear 返回字段与文档一致', async () => {
    todayTasksServiceMock.clearTodayTasks.mockResolvedValue({
      deletedCount: 2,
    });

    const response = await request(app.getHttpServer())
      .post('/plan/today-tasks/clear')
      .set('Authorization', 'Bearer user-token')
      .send({ taskDate: '2026-05-08' })
      .expect(201);

    expect(Object.keys(getData(response))).toEqual(['deletedCount']);
  });

  it('POST /plan/today-tasks/ai-generate 返回字段与文档一致', async () => {
    todayTasksServiceMock.generateTodayTasks.mockResolvedValue({
      list: [
        {
          title: '任务1',
          description: '描述1',
          priority: 'high',
          source: 'ai',
        },
      ],
      count: 1,
    });

    const response = await request(app.getHttpServer())
      .post('/plan/today-tasks/ai-generate')
      .set('Authorization', 'Bearer user-token')
      .send({ prompt: '帮我生成任务', count: 1 })
      .expect(201);

    expect(Object.keys(getData(response))).toEqual(['list', 'count']);
    expect(Object.keys(getListItem(response))).toEqual([
      'title',
      'description',
      'priority',
      'source',
    ]);
  });

  it('GET /plan/long-tasks 返回字段与文档一致', async () => {
    longTasksServiceMock.getLongTasks.mockResolvedValue({
      list: [
        {
          id: 11,
          title: '长期任务1',
          description: '描述1',
          priority: 'medium',
          isCompleted: false,
          startDate: '2026-05-01',
          source: 'manual',
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-01T00:00:00.000Z',
        },
      ],
      total: 1,
    });

    const response = await request(app.getHttpServer())
      .get('/plan/long-tasks')
      .set('Authorization', 'Bearer user-token')
      .expect(200);

    expect(Object.keys(getData(response))).toEqual(['list', 'total']);
    expect(Object.keys(getListItem(response))).toEqual([
      'id',
      'title',
      'description',
      'priority',
      'isCompleted',
      'startDate',
      'source',
      'createdAt',
      'updatedAt',
    ]);
  });

  it('POST /plan/long-tasks 返回字段与文档一致', async () => {
    longTasksServiceMock.createLongTask.mockResolvedValue({
      id: 11,
      title: '长期任务1',
      description: '描述1',
      priority: 'medium',
      isCompleted: false,
      startDate: '2026-05-01',
      source: 'manual',
    });

    const response = await request(app.getHttpServer())
      .post('/plan/long-tasks')
      .set('Authorization', 'Bearer user-token')
      .send({ title: '长期任务1', priority: 'medium' })
      .expect(201);

    expect(Object.keys(getData(response))).toEqual([
      'id',
      'title',
      'description',
      'priority',
      'isCompleted',
      'startDate',
      'source',
    ]);
  });

  it('PUT /plan/long-tasks/:id 返回字段与文档一致', async () => {
    longTasksServiceMock.updateLongTask.mockResolvedValue({
      id: 11,
      title: '长期任务1',
      description: '描述1',
      priority: 'medium',
      isCompleted: true,
      startDate: '2026-05-01',
      source: 'manual',
      updatedAt: '2026-05-08T12:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .put('/plan/long-tasks/11')
      .set('Authorization', 'Bearer user-token')
      .send({ isCompleted: true })
      .expect(200);

    expect(Object.keys(getData(response))).toEqual([
      'id',
      'title',
      'description',
      'priority',
      'isCompleted',
      'startDate',
      'source',
      'updatedAt',
    ]);
  });

  it('DELETE /plan/long-tasks/:id 返回字段与文档一致', async () => {
    longTasksServiceMock.deleteLongTask.mockResolvedValue({ id: 11 });

    const response = await request(app.getHttpServer())
      .delete('/plan/long-tasks/11')
      .set('Authorization', 'Bearer user-token')
      .expect(200);

    expect(Object.keys(getData(response))).toEqual(['id']);
  });

  it('POST /plan/long-tasks/clear 返回字段与文档一致', async () => {
    longTasksServiceMock.clearLongTasks.mockResolvedValue({ deletedCount: 3 });

    const response = await request(app.getHttpServer())
      .post('/plan/long-tasks/clear')
      .set('Authorization', 'Bearer user-token')
      .expect(201);

    expect(Object.keys(getData(response))).toEqual(['deletedCount']);
  });

  it('POST /plan/long-tasks/ai-generate 返回字段与文档一致', async () => {
    longTasksServiceMock.generateLongTasks.mockResolvedValue({
      list: [
        {
          title: '长期任务1',
          description: '描述1',
          priority: 'high',
          source: 'ai',
        },
      ],
      count: 1,
    });

    const response = await request(app.getHttpServer())
      .post('/plan/long-tasks/ai-generate')
      .set('Authorization', 'Bearer user-token')
      .send({ prompt: '生成长期任务', count: 1 })
      .expect(201);

    expect(Object.keys(getData(response))).toEqual(['list', 'count']);
    expect(Object.keys(getListItem(response))).toEqual([
      'title',
      'description',
      'priority',
      'source',
    ]);
  });

  it('GET /plan/long-tasks/:id/daily-plans 返回字段与文档一致', async () => {
    dailyPlansServiceMock.getDailyPlans.mockResolvedValue({
      list: [
        {
          id: 21,
          longTaskId: 11,
          content: '计划1',
          planDate: '2026-05-08',
          isCompleted: false,
          createdAt: '2026-05-08T00:00:00.000Z',
          updatedAt: '2026-05-08T00:00:00.000Z',
        },
      ],
      total: 1,
    });

    const response = await request(app.getHttpServer())
      .get('/plan/long-tasks/11/daily-plans')
      .set('Authorization', 'Bearer user-token')
      .expect(200);

    expect(Object.keys(getData(response))).toEqual(['list', 'total']);
    expect(Object.keys(getListItem(response))).toEqual([
      'id',
      'longTaskId',
      'content',
      'planDate',
      'isCompleted',
      'createdAt',
      'updatedAt',
    ]);
  });

  it('POST /plan/long-tasks/:id/daily-plans 返回字段与文档一致', async () => {
    dailyPlansServiceMock.createDailyPlan.mockResolvedValue({
      id: 21,
      longTaskId: 11,
      content: '计划1',
      planDate: '2026-05-08',
      isCompleted: false,
    });

    const response = await request(app.getHttpServer())
      .post('/plan/long-tasks/11/daily-plans')
      .set('Authorization', 'Bearer user-token')
      .send({ content: '计划1', planDate: '2026-05-08' })
      .expect(201);

    expect(Object.keys(getData(response))).toEqual([
      'id',
      'longTaskId',
      'content',
      'planDate',
      'isCompleted',
    ]);
  });

  it('PUT /plan/daily-plans/:id 返回字段与文档一致', async () => {
    dailyPlansServiceMock.updateDailyPlan.mockResolvedValue({
      id: 21,
      longTaskId: 11,
      content: '计划1',
      planDate: '2026-05-08',
      isCompleted: true,
      updatedAt: '2026-05-08T12:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .put('/plan/daily-plans/21')
      .set('Authorization', 'Bearer user-token')
      .send({ isCompleted: true })
      .expect(200);

    expect(Object.keys(getData(response))).toEqual([
      'id',
      'longTaskId',
      'content',
      'planDate',
      'isCompleted',
      'updatedAt',
    ]);
  });

  it('DELETE /plan/daily-plans/:id 返回字段与文档一致', async () => {
    dailyPlansServiceMock.deleteDailyPlan.mockResolvedValue({ id: 21 });

    const response = await request(app.getHttpServer())
      .delete('/plan/daily-plans/21')
      .set('Authorization', 'Bearer user-token')
      .expect(200);

    expect(Object.keys(getData(response))).toEqual(['id']);
  });

  it('POST /plan/long-tasks/:id/daily-plans/ai-generate 返回字段与文档一致', async () => {
    dailyPlansServiceMock.generateDailyPlans.mockResolvedValue({
      list: [
        {
          content: '计划1',
          planDate: '2026-05-08',
        },
      ],
      count: 1,
    });

    const response = await request(app.getHttpServer())
      .post('/plan/long-tasks/11/daily-plans/ai-generate')
      .set('Authorization', 'Bearer user-token')
      .send({ prompt: '生成每日计划', count: 1 })
      .expect(201);

    expect(Object.keys(getData(response))).toEqual(['list', 'count']);
    expect(Object.keys(getListItem(response))).toEqual(['content', 'planDate']);
  });

  it('GET /plan/profile 返回字段与文档一致', async () => {
    profileServiceMock.getProfile.mockResolvedValue({
      id: 1,
      username: 'tester',
      email: 'user@example.com',
      avatar: '/uploads/avatars/a.png',
      role: 'user',
      aiPrompt: 'prompt',
      createdAt: '2026-05-08T00:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .get('/plan/profile')
      .set('Authorization', 'Bearer user-token')
      .expect(200);

    expect(Object.keys(getData(response))).toEqual([
      'id',
      'username',
      'email',
      'avatar',
      'role',
      'aiPrompt',
      'createdAt',
    ]);
  });

  it('POST /plan/profile/avatar 返回字段与文档一致', async () => {
    profileServiceMock.uploadAvatar.mockResolvedValue({
      avatar: '/uploads/avatars/a.png',
      updatedAt: '2026-05-08T12:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .post('/plan/profile/avatar')
      .set('Authorization', 'Bearer user-token')
      .attach('file', Buffer.from('avatar'), 'avatar.png')
      .expect(201);

    expect(Object.keys(getData(response))).toEqual(['avatar', 'updatedAt']);
  });

  it('PUT /plan/profile/ai-config 返回字段与文档一致', async () => {
    profileServiceMock.updateAiConfig.mockResolvedValue({
      provider: 'openai',
      model: 'gpt-4o',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test',
      updatedAt: '2026-05-08T12:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .put('/plan/profile/ai-config')
      .set('Authorization', 'Bearer user-token')
      .send({
        provider: 'openai',
        model: 'gpt-4o',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
      })
      .expect(200);

    expect(Object.keys(getData(response))).toEqual([
      'provider',
      'model',
      'baseUrl',
      'apiKey',
      'updatedAt',
    ]);
  });

  it('GET /plan/profile/stats 返回字段与文档一致', async () => {
    profileServiceMock.getProfileStats.mockResolvedValue({
      totalCompletedTasks: 10,
      todayCompletedTasks: 2,
      monthCompletedTasks: 5,
      todayTasksCompletionRate: 40,
      longTasksCompletionRate: 50,
      trend: [
        {
          date: '2026-05-08',
          value: 2,
        },
      ],
    });

    const response = await request(app.getHttpServer())
      .get('/plan/profile/stats?periodType=weekly&date=2026-05-08')
      .set('Authorization', 'Bearer user-token')
      .expect(200);

    expect(Object.keys(getData(response))).toEqual([
      'totalCompletedTasks',
      'todayCompletedTasks',
      'monthCompletedTasks',
      'todayTasksCompletionRate',
      'longTasksCompletionRate',
      'trend',
    ]);
    expect(
      Object.keys(
        (getData(response).trend as Array<Record<string, unknown>>)[0],
      ),
    ).toEqual(['date', 'value']);
  });

  it('GET /plan/admin/users 返回字段与文档一致', async () => {
    adminServiceMock.getUsers.mockResolvedValue({
      list: [
        {
          id: 1,
          username: 'tester',
          email: 'user@example.com',
          avatar: '/uploads/avatars/a.png',
          role: 'user',
          status: 'active',
          createdAt: '2026-05-08T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const response = await request(app.getHttpServer())
      .get('/plan/admin/users')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(Object.keys(getData(response))).toEqual([
      'list',
      'total',
      'page',
      'pageSize',
    ]);
    expect(Object.keys(getListItem(response))).toEqual([
      'id',
      'username',
      'email',
      'avatar',
      'role',
      'status',
      'createdAt',
    ]);
  });

  it('GET /plan/admin/users/:id 返回字段与文档一致', async () => {
    adminServiceMock.getUserDetail.mockResolvedValue({
      id: 1,
      username: 'tester',
      email: 'user@example.com',
      avatar: '/uploads/avatars/a.png',
      role: 'user',
      status: 'active',
      aiPrompt: 'prompt',
      createdAt: '2026-05-08T00:00:00.000Z',
      updatedAt: '2026-05-08T12:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .get('/plan/admin/users/1')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(Object.keys(getData(response))).toEqual([
      'id',
      'username',
      'email',
      'avatar',
      'role',
      'status',
      'aiPrompt',
      'createdAt',
      'updatedAt',
    ]);
  });

  it('GET /plan/admin/users/:id/stats 返回字段与文档一致', async () => {
    adminServiceMock.getUserStats.mockResolvedValue({
      totalCompletedTasks: 10,
      todayCompletedTasks: 2,
      monthCompletedTasks: 5,
      todayTasksCompletionRate: 40,
      longTasksCompletionRate: 50,
      trend: [
        {
          date: '2026-05',
          value: 5,
        },
      ],
    });

    const response = await request(app.getHttpServer())
      .get('/plan/admin/users/1/stats?periodType=yearly&date=2026-05-08')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(Object.keys(getData(response))).toEqual([
      'totalCompletedTasks',
      'todayCompletedTasks',
      'monthCompletedTasks',
      'todayTasksCompletionRate',
      'longTasksCompletionRate',
      'trend',
    ]);
    expect(
      Object.keys(
        (getData(response).trend as Array<Record<string, unknown>>)[0],
      ),
    ).toEqual(['date', 'value']);
  });
});
