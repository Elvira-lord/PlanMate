# PROJECT_MAP.md — PlanMate 项目文件结构

> 最后更新：2026-05-13

---

## 项目根目录

```
D:\learn_data\code\trae\PlanMate\
├── architecture.md          # 架构文档
├── api-spec.md              # API 接口定义文档
├── dev-log.md               # 开发日志
├── PROJECT_MAP.md           # 本文件
├── missing-features.md      # 缺失功能清单（5/10 版本，部分已实现）
├── database.schema.sql      # 数据库建表 SQL（早期参考）
│
├── backend/                 # NestJS 后端
│   ├── .env                 # 环境变量（PORT, DATABASE_URL, JWT_SECRET, AI_*, charset=utf8mb4）
│   ├── .env.example         # 环境变量模板
│   ├── .gitignore
│   ├── .prettierrc
│   ├── eslint.config.mjs
│   ├── nest-cli.json
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── prisma.config.ts
│   ├── README.md
│   │
│   ├── prisma/
│   │   └── schema.prisma    # Prisma 数据模型（5张表：users, today_tasks, long_tasks, long_task_checkins, daily_plans）
│   │
│   ├── src/
│   │   ├── main.ts          # 入口：dotenv/config + NestFactory + CORS + ValidationPipe + 静态文件
│   │   ├── app.module.ts    # 根模块：注册所有业务模块
│   │   │
│   │   ├── prisma/          # 数据库连接
│   │   │   ├── prisma.module.ts
│   │   │   └── prisma.service.ts  # @prisma/adapter-mariadb
│   │   │
│   │   ├── auth/            # 认证模块
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts   # POST /register, POST /login
│   │   │   ├── auth.service.ts      # bcrypt 加密、JWT 签发
│   │   │   ├── jwt.strategy.ts      # Passport JWT 策略
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts  # JWT 鉴权守卫
│   │   │   │   └── admin.guard.ts     # 管理员权限守卫（role === 'admin'）
│   │   │   ├── decorators/
│   │   │   │   └── current-user.decorator.ts  # @CurrentUser() 装饰器
│   │   │   └── dto/
│   │   │       ├── register.dto.ts
│   │   │       └── login.dto.ts
│   │   │
│   │   ├── ai/              # AI 服务模块
│   │   │   ├── ai.module.ts
│   │   │   └── ai.service.ts    # 双 provider(anthropic/openai)、用户配置优先、baseUrl 标准化、JSON 容错
│   │   │
│   │   ├── today-tasks/     # 今日任务模块
│   │   │   ├── today-tasks.module.ts
│   │   │   ├── today-tasks.controller.ts  # GET/POST/PUT/DELETE /clear /ai-generate
│   │   │   ├── today-tasks.service.ts     # 任务顺延逻辑、5 个上限
│   │   │   └── dto/
│   │   │       ├── create-today-task.dto.ts
│   │   │       ├── update-today-task.dto.ts
│   │   │       ├── get-today-tasks.dto.ts
│   │   │       ├── clear-today-tasks.dto.ts
│   │   │       └── generate-today-tasks.dto.ts
│   │   │
│   │   ├── long-tasks/      # 长期任务模块
│   │   │   ├── long-tasks.module.ts
│   │   │   ├── long-tasks.controller.ts   # GET/POST/PUT/DELETE /clear /ai-generate /checkin
│   │   │   ├── long-tasks.service.ts      # 打卡 toggle 逻辑
│   │   │   └── dto/
│   │   │       ├── create-long-task.dto.ts
│   │   │       ├── update-long-task.dto.ts
│   │   │       ├── get-long-tasks.dto.ts
│   │   │       ├── generate-long-tasks.dto.ts
│   │   │       └── checkin.dto.ts         # 打卡 DTO（可选 date）
│   │   │
│   │   ├── daily-plans/     # 每日计划模块
│   │   │   ├── daily-plans.module.ts
│   │   │   ├── daily-plans.controller.ts  # GET/POST/PUT/DELETE /ai-generate
│   │   │   ├── daily-plans.service.ts
│   │   │   └── dto/
│   │   │       ├── create-daily-plan.dto.ts
│   │   │       ├── update-daily-plan.dto.ts
│   │   │       ├── generate-daily-plans.dto.ts
│   │   │       └── get-daily-plans.dto.ts
│   │   │
│   │   ├── profile/         # 个人中心模块
│   │   │   ├── profile.module.ts
│   │   │   ├── profile.controller.ts  # GET/PUT /avatar /ai-prompt /ai-config /password /stats
│   │   │   ├── profile.service.ts     # 统计汇总（today+long+daily）、趋势计算
│   │   │   └── dto/
│   │   │       ├── update-profile.dto.ts
│   │   │       ├── update-ai-prompt.dto.ts   # aiPrompt @IsOptional()
│   │   │       ├── update-ai-config.dto.ts   # provider/model/baseUrl/apiKey 均可选
│   │   │       ├── change-password.dto.ts
│   │   │       └── get-profile-stats.dto.ts
│   │   │
│   │   ├── admin/           # 管理员模块
│   │   │   ├── admin.module.ts
│   │   │   ├── admin.controller.ts   # GET/PUT/PATCH/DELETE /users /reset-password
│   │   │   ├── admin.service.ts      # 复用 ProfileService.stats，禁用状态暂存 aiBaseUrl
│   │   │   └── dto/
│   │   │       ├── get-admin-users.dto.ts
│   │   │       ├── update-admin-user.dto.ts
│   │   │       ├── update-admin-user-status.dto.ts
│   │   │       └── reset-admin-user-password.dto.ts
│   │   │
│   │   └── common/          # 公共基础设施
│   │       ├── interceptors/
│   │       │   └── transform.interceptor.ts  # 统一响应包装 { code, message, data }
│   │       └── filters/
│   │           └── http-exception.filter.ts  # 全局异常过滤器
│   │
│   ├── uploads/             # 用户上传文件（gitignore）
│   │   └── avatars/         # 头像存储目录
│   │
│   └── test/                # 测试
│       ├── app.e2e-spec.ts
│       └── new-apis.e2e-spec.ts
│
├── frontend/                # React + Vite 前端
│   ├── .env.example
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.ts       # Vite 配置，proxy 到 3000
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   │
│   ├── public/
│   │   └── vite.svg
│   │
│   ├── src/
│   │   ├── main.tsx         # React 挂载入口
│   │   ├── App.tsx          # 全部页面 + 逻辑（~1802 行，未拆分）
│   │   ├── App.css          # 全部样式（~1119 行）
│   │   ├── index.css        # 全局基础样式
│   │   ├── api.ts           # Axios 实例 + Bearer token 注入 + 401 自动 logout + unwrapResponse
│   │   ├── auth-store.ts    # Zustand 登录态持久化（token/role/username → localStorage）
│   │   ├── services.ts      # 全部业务 API 封装 + TypeScript 类型定义
│   │   └── mock-data.ts     # 静态文案数据
│   │
│   └── dist/                # Vite 构建产物（349KB JS + 20KB CSS）
│       ├── index.html
│       └── assets/
│           ├── index-*.js
│           └── index-*.css
│
└── (可清理的残留)
    ├── css/                 # 空文件夹，早期残留
    └── js/                  # 空文件夹，早期残留
```

---

## 关键配置说明

### 后端 .env

| 变量 | 说明 | 当前值示例 |
|------|------|-----------|
| PORT | 后端端口 | 3000 |
| DATABASE_URL | 数据库连接串 | mysql://root:root@localhost:3306/planmate?charset=utf8mb4 |
| JWT_SECRET | JWT 签名密钥 | planmate-dev-secret |
| AI_PROVIDER | 默认 AI 厂商 | anthropic |
| AI_MODEL | 默认 AI 模型 | claude-opus-4-7 |
| AI_BASE_URL | AI API 地址 | （留空则使用 SDK 默认） |
| AI_API_KEY | AI API Key | sk-placeholder-for-local-startup |

### 前端环境

| 变量 | 说明 | 默认值 |
|------|------|--------|
| VITE_API_BASE_URL | 后端 API 地址 | http://localhost:3000 |

---

## 路由注册一览

| 方法 | 路径 | 模块 | 鉴权 |
|------|------|------|------|
| POST | /plan/auth/register | Auth | 否 |
| POST | /plan/auth/login | Auth | 否 |
| GET | /plan/profile | Profile | JWT |
| PUT | /plan/profile | Profile | JWT |
| POST | /plan/profile/avatar | Profile | JWT |
| PUT | /plan/profile/ai-prompt | Profile | JWT |
| PUT | /plan/profile/ai-config | Profile | JWT |
| PUT | /plan/profile/password | Profile | JWT |
| GET | /plan/profile/stats | Profile | JWT |
| GET | /plan/today-tasks | TodayTasks | JWT |
| POST | /plan/today-tasks | TodayTasks | JWT |
| PUT | /plan/today-tasks/:id | TodayTasks | JWT |
| DELETE | /plan/today-tasks/:id | TodayTasks | JWT |
| POST | /plan/today-tasks/clear | TodayTasks | JWT |
| POST | /plan/today-tasks/ai-generate | TodayTasks | JWT |
| GET | /plan/long-tasks | LongTasks | JWT |
| POST | /plan/long-tasks | LongTasks | JWT |
| PUT | /plan/long-tasks/:id | LongTasks | JWT |
| DELETE | /plan/long-tasks/:id | LongTasks | JWT |
| POST | /plan/long-tasks/clear | LongTasks | JWT |
| POST | /plan/long-tasks/ai-generate | LongTasks | JWT |
| POST | /plan/long-tasks/:id/checkin | LongTasks | JWT |
| GET | /plan/long-tasks/:id/daily-plans | DailyPlans | JWT |
| POST | /plan/long-tasks/:id/daily-plans | DailyPlans | JWT |
| PUT | /plan/daily-plans/:id | DailyPlans | JWT |
| DELETE | /plan/daily-plans/:id | DailyPlans | JWT |
| POST | /plan/long-tasks/:id/daily-plans/ai-generate | DailyPlans | JWT |
| GET | /plan/admin/users | Admin | JWT + Admin |
| GET | /plan/admin/users/:id | Admin | JWT + Admin |
| GET | /plan/admin/users/:id/stats | Admin | JWT + Admin |
| PUT | /plan/admin/users/:id | Admin | JWT + Admin |
| PATCH | /plan/admin/users/:id/status | Admin | JWT + Admin |
| DELETE | /plan/admin/users/:id | Admin | JWT + Admin |
| POST | /plan/admin/users/:id/reset-password | Admin | JWT + Admin |

共 32 个路由端点。
