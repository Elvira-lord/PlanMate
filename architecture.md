# PlanMate 架构文档

> 最后更新：2026-05-13

---

## 1. 项目概览

**PlanMate** 是一个基于 AI 的待办事项与任务规划应用，采用前后端分离架构。

- **项目名称**：PlanMate（待办事项应用）
- **架构模式**：前后端分离
- **后端**：NestJS + Prisma 7 + MySQL (MariaDB)
- **前端**：React + TypeScript + Vite + Zustand
- **AI 集成**：Anthropic Claude / OpenAI 兼容 API

---

## 2. 用户角色

| 角色 | 说明 |
|------|------|
| user | 普通用户，使用所有待办功能 |
| admin | 管理员，使用所有待办功能，并额外拥有管理员模块可查看/管理其他用户 |

---

## 3. 页面结构

### 页面1：今日任务
- 展示今天的任务列表
- 可手动新建任务
- 可输入一句话让 AI 生成 5 个推荐任务
- 用户确认后，可将 AI 任务加入今日任务
- 每天任务总数最多 5 个
- 每条任务支持勾选完成
- 任务未完成时自动延到明天，并以此类推继续顺延
- 支持按日期筛选

### 页面2：长期任务
- 可手动创建长期任务
- 可输入一句话让 AI 生成长期任务建议
- 每个长期任务下可继续拆分每日计划
- 长期任务支持每日打卡（toggle 模式）
- 支持勾选完成

### 页面3：AI 规划
- 用户输入一句话需求
- 系统通过 AI 输出任务规划建议
- 后续再决定具体落到今日任务还是长期任务

### 页面4：我的
- 展示用户头像、用户名、邮箱
- 支持修改用户名与邮箱
- 支持上传头像（jpg/png/webp，2MB 上限）
- 支持修改密码
- 支持修改 AI 提示词
- 支持 AI 接入配置（provider/model/baseUrl/apiKey）
- 展示任务统计数据与趋势图

### 页面5：管理员（仅 admin 可见）
- 用户列表（支持搜索/筛选/分页）
- 用户详情弹窗
- 修改用户角色
- 切换用户状态（启用/禁用）
- 重置用户密码
- 删除用户

---

## 4. 技术架构

### 4.1 后端技术栈

| 层次 | 技术 | 版本/说明 |
|------|------|----------|
| 框架 | NestJS | 模块化架构 |
| ORM | Prisma 7 | @prisma/adapter-mariadb |
| 数据库 | MySQL (MariaDB) | charset=utf8mb4 |
| 认证 | Passport + JWT | Bearer token |
| AI SDK | anthropic + openai | 双 provider 支持 |
| 文件上传 | Multer | 头像本地存储 |
| 密码加密 | bcrypt | 命名空间导入方式 |
| 参数校验 | class-validator + ValidationPipe | whitelist + transform + forbidNonWhitelisted |

### 4.2 前端技术栈

| 层次 | 技术 | 说明 |
|------|------|------|
| 框架 | React 19 | 函数式组件 |
| 构建 | Vite 8 | ~350KB JS / ~20KB CSS |
| 状态管理 | Zustand | 登录态持久化 |
| HTTP 客户端 | Axios | 统一请求层 + 401 拦截器 |
| 样式 | 原生 CSS | 非 Tailwind |
| 路由 | 无 | 单文件 App.tsx (~1802行) |

### 4.3 运行端口

| 服务 | 端口 | 说明 |
|------|------|------|
| 后端 API | 3000 | NestJS，路由前缀 /plan |
| 前端 Dev | 5173 | Vite dev server |

---

## 5. 数据库设计

### 5.1 ER 关系

```
User 1──N TodayTask
User 1──N LongTask
User 1──N LongTaskCheckin
User 1──N DailyPlan
LongTask 1──N DailyPlan
LongTask 1──N LongTaskCheckin
```

### 5.2 表结构

#### users 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | 用户 ID |
| username | VARCHAR(50) | UNIQUE, NOT NULL | 用户名 |
| email | VARCHAR(100) | UNIQUE, NOT NULL | 邮箱 |
| password | VARCHAR(255) | NOT NULL | bcrypt 密码哈希 |
| avatar | VARCHAR(255) | NULL | 头像路径（相对路径） |
| role | VARCHAR(20) | DEFAULT 'user' | 角色：user / admin |
| ai_prompt | VARCHAR(255) | DEFAULT '你是一个待办事项助手...' | AI 提示词 |
| ai_provider | VARCHAR(50) | NULL | AI 厂商 |
| ai_model | VARCHAR(100) | NULL | AI 模型名 |
| ai_base_url | VARCHAR(255) | NULL | AI API 地址 |
| ai_api_key | VARCHAR(255) | NULL | AI API Key |
| created_at | DATETIME | DEFAULT NOW() | 创建时间 |
| updated_at | DATETIME | ON UPDATE | 更新时间 |

> ⚠️ **临时方案**：用户禁用状态当前复用 `ai_base_url` 字段存 `__disabled__` 占位值，待补正式 `status` 字段。

#### today_tasks 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | 任务 ID |
| user_id | BIGINT UNSIGNED | FK → users.id, ON DELETE CASCADE | 所属用户 |
| title | VARCHAR(100) | NOT NULL | 任务标题 |
| description | TEXT | NULL | 任务描述 |
| priority | VARCHAR(10) | NOT NULL | 优先级：high / medium / low |
| is_completed | BOOLEAN | DEFAULT FALSE | 是否完成 |
| task_date | DATE | NOT NULL | 当前所属任务日期 |
| original_date | DATE | NOT NULL | 最初所属日期 |
| carry_over_count | INT UNSIGNED | DEFAULT 0 | 顺延次数 |
| sort_order | INT | DEFAULT 0 | 排序值 |
| source | VARCHAR(10) | NOT NULL | 来源：manual / ai |
| created_at | DATETIME | DEFAULT NOW() | 创建时间 |
| updated_at | DATETIME | ON UPDATE | 更新时间 |

索引：`idx_today_tasks_user_date(user_id, task_date)`, `idx_today_tasks_user_completed(user_id, is_completed)`

#### long_tasks 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | 任务 ID |
| user_id | BIGINT UNSIGNED | FK → users.id, ON DELETE CASCADE | 所属用户 |
| title | VARCHAR(100) | NOT NULL | 任务标题 |
| description | TEXT | NULL | 任务描述 |
| priority | VARCHAR(10) | NOT NULL | 优先级：high / medium / low |
| is_completed | BOOLEAN | DEFAULT FALSE | 是否完成 |
| start_date | DATE | NOT NULL | 开始日期 |
| source | VARCHAR(10) | NOT NULL | 来源：manual / ai |
| created_at | DATETIME | DEFAULT NOW() | 创建时间 |
| updated_at | DATETIME | ON UPDATE | 更新时间 |

索引：`idx_long_tasks_user_completed(user_id, is_completed)`

#### long_task_checkins 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | 打卡 ID |
| long_task_id | BIGINT UNSIGNED | FK → long_tasks.id, ON DELETE CASCADE | 关联长期任务 |
| user_id | BIGINT UNSIGNED | FK → users.id, ON DELETE CASCADE | 所属用户 |
| check_date | DATE | NOT NULL | 打卡日期 |
| created_at | DATETIME | DEFAULT NOW() | 创建时间 |

唯一约束：`idx_long_task_checkin_unique(long_task_id, check_date)`
索引：`idx_long_task_checkins_user_date(user_id, check_date)`

#### daily_plans 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | 计划 ID |
| long_task_id | BIGINT UNSIGNED | FK → long_tasks.id, ON DELETE CASCADE | 关联长期任务 |
| user_id | BIGINT UNSIGNED | FK → users.id, ON DELETE CASCADE | 所属用户 |
| content | VARCHAR(255) | NOT NULL | 计划内容 |
| plan_date | DATE | NOT NULL | 计划日期 |
| is_completed | BOOLEAN | DEFAULT FALSE | 是否完成 |
| created_at | DATETIME | DEFAULT NOW() | 创建时间 |
| updated_at | DATETIME | ON UPDATE | 更新时间 |

索引：`idx_daily_plans_user_date(user_id, plan_date)`, `idx_daily_plans_long_task(long_task_id)`

---

## 6. 后端模块架构

```
AppModule
├── PrismaModule          (数据库连接)
├── AuthModule            (认证/鉴权)
│   ├── JwtStrategy
│   ├── JwtAuthGuard
│   └── AdminGuard
├── AiModule              (AI 服务)
├── TodayTasksModule      (今日任务)
├── LongTasksModule       (长期任务 + 打卡)
├── DailyPlansModule      (每日计划)
├── ProfileModule         (个人中心 + 统计)
└── AdminModule           (管理员，复用 ProfileService.stats)
```

### 6.1 全局基础设施

- **TransformInterceptor**：统一包装响应为 `{ code, message, data }`
- **ValidationPipe**：whitelist + transform + forbidNonWhitelisted
- **CORS**：origin: true, credentials: true
- **静态文件**：`/uploads/` → `backend/uploads/`
- **dotenv**：main.ts 顶部 `import 'dotenv/config'`

### 6.2 认证链路

1. 注册：邮箱+用户名去重 → bcrypt 加密 → 入库 → 返回 JWT
2. 登录：邮箱查用户 → bcrypt 对比 → 签发 JWT（含 sub/id/email/role）
3. 鉴权：JwtAuthGuard 从 Bearer token 解析用户 → 注入 req.user
4. 管理员：AdminGuard 在 JwtAuthGuard 之后校验 role === 'admin'

### 6.3 AI 服务设计

- **懒加载**：AI 配置不在启动时校验，实际调用时才初始化客户端
- **双 provider**：支持 anthropic 和 openai（兼容中转站）
- **用户级配置**：优先使用用户自己的 AI 配置，fallback 到 .env 默认值
- **baseUrl 标准化**：去末尾斜杠 + 截掉 /chat/completions 后缀
- **JSON 容错**：自动去除 Markdown 代码块包裹，提取首个完整 JSON

### 6.4 今日任务顺延逻辑

- 首次打开今日任务时，自动将历史未完成任务顺延到当天
- 创建/AI生成任务前也执行顺延
- 每次顺延 carryOverCount++，originalDate 不变

---

## 7. 前端架构

### 7.1 文件结构

```
frontend/src/
├── main.tsx         (React 挂载入口)
├── App.tsx          (~1802行，所有页面+逻辑)
├── App.css          (~1119行，所有样式)
├── index.css        (全局基础样式)
├── api.ts           (Axios 实例 + 401 拦截器 + 响应解包)
├── auth-store.ts    (Zustand 登录态持久化)
├── services.ts      (全部业务 API 封装 + TypeScript 类型)
└── mock-data.ts     (静态文案数据)
```

### 7.2 状态管理

- **Zustand (auth-store)**：token / role / username 持久化到 localStorage
- **React useState**：页面级状态（任务列表、表单数据、分页等）
- 无全局路由，通过 activeNav state 切换页面视图

### 7.3 API 调用链路

```
组件调用 services.ts 函数
  → api.ts Axios 实例（自动注入 Bearer token）
  → 后端 /plan/* 接口
  → 401 时自动 logout
  → unwrapResponse 解包 { code, message, data }
```

---

## 8. 环境配置

### 8.1 后端 .env

```env
PORT=3000
DATABASE_URL="mysql://root:root@localhost:3306/planmate?charset=utf8mb4"
JWT_SECRET="planmate-dev-secret"
AI_PROVIDER="anthropic"
AI_MODEL="claude-opus-4-7"
AI_BASE_URL=""
AI_API_KEY="sk-placeholder-for-local-startup"
```

> ⚠️ 数据库名实际为 `planmate`（全小写），.env 中 `PlanMate` 也能连接（MariaDB 大小写不敏感），建议统一为小写。

### 8.2 前端环境

```env
VITE_API_BASE_URL=http://localhost:3000
```

不配置时默认 `http://localhost:3000`。

---

## 9. 已知技术债务

| 序号 | 问题 | 当前状态 | 正确做法 |
|------|------|----------|----------|
| 1 | 用户禁用状态存储 | 复用 ai_base_url 存 __disabled__ | users 表补正式 status 字段 |
| 2 | 管理员 status 固定返回 active | 查询接口硬编码 active | 改为数据库真实值 |
| 3 | App.tsx 单文件 1802 行 | 未拆分组件 | 拆分为页面/组件/hooks |
| 4 | Prisma 无 migration | 靠 db push 同步 | 补 migration 目录和流程 |
| 5 | 列宽拖拽无持久化 | 仅存页面 state | 接入 localStorage |
| 6 | DATABASE_URL 大小写 | .env 写 PlanMate，实际 planmate | 统一为小写 |
| 7 | 无前端路由 | activeNav 切换视图 | 引入 React Router |
| 8 | npm Invalid Version | 环境问题 | 阻塞 Vitest/shadcn/ui |

---

## 10. 通用功能要求

- 登录注册
- 所有用户数据相互隔离（userId 过滤）
- 接口需支持鉴权（JWT Bearer token）
- 管理员可查看/管理其他用户
- AI 生成结果仅作为建议返回，不直接写入数据库
