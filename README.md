# PlanMate

一个基于 AI 辅助的个人任务规划应用，支持今日任务管理、长期任务打卡、每日计划拆解。

## 技术栈

- **后端**：NestJS + Prisma 7 + MySQL (MariaDB)
- **前端**：React + Vite + Zustand
- **认证**：JWT Bearer Token
- **AI**：OpenAI / Anthropic 兼容接口（用户自行配置）

## 环境要求

- Node.js >= 18
- npm >= 9
- MySQL 5.7+ 或 MariaDB 10.3+（确保服务已启动）
- 一个兼容 OpenAI 或 Anthropic 格式的 AI API（可选，用于任务生成）

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Elvira-lord/PlanMate.git
cd PlanMate
```

### 2. 后端配置

```bash
cd backend

# 安装依赖
npm install

# 复制环境变量模板
cp .env.example .env
```

编辑 `backend/.env`，填入实际配置：

```env
# 数据库（必填）
DATABASE_URL="mysql://root:your_password@localhost:3306/planmate?charset=utf8mb4"

# JWT 密钥（必填，生产环境请用随机字符串）
JWT_SECRET="your-jwt-secret-here"

# 服务端口（必填）
PORT=3000

# AI 配置（可选，登录后在个人设置中配置也可）
AI_PROVIDER="openai"
AI_MODEL="gpt-4"
AI_BASE_URL=""
AI_API_KEY=""
```

### 3. 初始化数据库

```bash
# 在 backend 目录下执行

# 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS planmate DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 同步表结构（Prisma 会根据 schema.prisma 自动建表）
npx prisma db push

# 生成 Prisma Client
npx prisma generate
```

> 如果不使用命令行，也可以手动在 MySQL 客户端执行项目根目录的 `database.schema.sql` 文件来建表。

### 4. 启动后端

```bash
# 开发模式（热重载）
npm run start:dev

# 或生产模式
npm run build
npm run start:prod
```

后端默认运行在 `http://localhost:3000`，API 前缀为 `/plan/`。

### 5. 前端配置

```bash
cd frontend

# 安装依赖
npm install

# 复制环境变量模板
cp .env.example .env
```

编辑 `frontend/.env`：

```env
VITE_API_BASE_URL=http://localhost:3000
```

### 6. 启动前端

```bash
# 开发模式
npm run dev

# 或构建生产版本
npm run build
npm run preview
```

前端默认运行在 `http://localhost:5173`。

### 7. 创建管理员账号

1. 在前端注册页面创建账号
2. 在 MySQL 中将该用户角色设为管理员：

```sql
USE planmate;
UPDATE users SET role = 'admin' WHERE email = 'your-admin@email.com';
```

3. 重新登录，即可访问管理后台

## 项目结构

```
PlanMate/
├── backend/                  # NestJS 后端
│   ├── prisma/
│   │   └── schema.prisma     # 数据库模型定义（权威源）
│   ├── src/
│   │   ├── admin/            # 管理员模块
│   │   ├── ai/               # AI 生成模块
│   │   ├── auth/             # 认证模块（JWT + bcrypt）
│   │   ├── daily-plans/      # 每日计划模块
│   │   ├── long-tasks/       # 长期任务 + 打卡模块
│   │   ├── profile/          # 个人设置模块
│   │   ├── today-tasks/      # 今日任务模块
│   │   └── common/           # 公共（拦截器、守卫、装饰器）
│   ├── uploads/avatars/      # 头像上传目录
│   ├── .env.example
│   └── package.json
├── frontend/                 # React + Vite 前端
│   ├── src/
│   │   ├── App.tsx           # 主应用（单文件）
│   │   ├── App.css           # 样式
│   │   ├── api.ts            # Axios 实例 + 拦截器
│   │   ├── auth-store.ts     # Zustand 认证状态
│   │   └── services.ts       # API 调用封装
│   ├── .env.example
│   └── package.json
├── database.schema.sql       # SQL 建表脚本（参考用，以 Prisma schema 为准）
└── .gitignore
```

## 数据库表

| 表名 | 说明 |
|------|------|
| `users` | 用户表（含 AI 配置字段） |
| `today_tasks` | 今日任务 |
| `long_tasks` | 长期任务 |
| `long_task_checkins` | 长期任务每日打卡记录 |
| `daily_plans` | 每日计划（关联长期任务） |

## AI 配置说明

PlanMate 支持两种 AI 供应商：

- **OpenAI 兼容接口**（如 OpenAI、DeepSeek、各种中转站）
- **Anthropic**（Claude 系列）

配置方式：
1. 登录后进入 **个人设置** 页面
2. 填写 AI 供应商、模型名称、接口地址、API Key
3. 接口地址只需填到根路径，例如 `https://api.openai.com/v1`，不要包含 `/chat/completions`

## API 返回格式

所有接口统一返回：

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

认证接口需在请求头携带：`Authorization: Bearer <token>`

## 常见问题

**Q: 数据库连接失败？**
- 确认 MySQL 服务已启动
- 检查 `.env` 中的 DATABASE_URL 用户名、密码、端口是否正确
- 确认数据库 `planmate` 已创建

**Q: 端口被占用？**
- 后端端口在 `.env` 的 `PORT` 字段修改
- 前端端口由 Vite 自动分配，或修改 `vite.config.ts`

**Q: AI 生成报错？**
- 检查个人设置中的 AI 配置是否正确
- 接口地址不要带 `/chat/completions` 后缀
- API Key 需要有对应模型的调用权限

**Q: 中文显示乱码？**
- 确保 DATABASE_URL 包含 `charset=utf8mb4`
- 确保 MySQL/MariaDB 的默认字符集为 utf8mb4
