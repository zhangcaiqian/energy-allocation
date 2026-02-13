# 留白（Blanc）

> 你今天留白了吗？

留白是一款面向互联网从业者的**精力觉察工具**。借鉴资产配置的思路，帮你像管理资产一样管理精力——永远保留一部分精力用于恢复，在忙碌中留出呼吸的空间。

## 核心理念

- **以人为本**：关注你的主观感受，而非任务完成量
- **精力配置**：始终保留 30%-40% 的精力用于恢复（可自定义）
- **温暖陪伴**：AI 教练「知秋」用温暖的方式帮你觉察精力状态

## 功能

- **精力 Check-in**：每天花几秒记录精力状态，80+ 温暖问题随机呈现
- **3D 花园**：精力值驱动花园场景变化，精力充沛时花朵盛开，疲惫时花朵低垂
- **AI 精力教练**：基于千问大模型，每次 check-in 后给出温暖回应和建议
- **精力趋势**：折线图展示精力变化，标记保留线，发现精力规律
- **自定义配置**：精力保留比例、check-in 时间点均可自定义

## 技术栈

| 层级    | 技术                                  |
| ------- | ------------------------------------- |
| 框架    | Next.js 16 (App Router)               |
| 样式    | TailwindCSS + 自定义组件              |
| 3D 场景 | React Three Fiber + @react-three/drei |
| 数据库  | Turso (SQLite) + Drizzle ORM          |
| 认证    | Auth.js (邮箱 + 密码)                 |
| LLM     | 通义千问 (DashScope API，OpenAI 兼容) |
| 部署    | Vercel                                |
| 包管理  | pnpm                                  |

## 快速开始

### 前置条件

- Node.js >= 18
- pnpm >= 8
- [千问 API Key](https://dashscope.console.aliyun.com/)（用于 AI 教练功能）

### 安装

```bash
# 克隆项目
git clone <your-repo-url>
cd energy-allocation

# 安装依赖
pnpm install
```

### 配置环境变量

复制 `.env.local` 文件并填写：

```bash
# 数据库 - 本地开发使用 SQLite，生产使用 Turso
TURSO_DATABASE_URL=file:local.db
TURSO_AUTH_TOKEN=

# Auth.js 密钥（请替换为随机字符串）
AUTH_SECRET=your-random-secret-string

# 千问 LLM API
DASHSCOPE_API_KEY=your-qwen-api-key
DASHSCOPE_MODEL=qwen-plus
```

### 初始化数据库

```bash
pnpm drizzle-kit push
```

### 启动开发服务器

```bash
pnpm dev
```

打开 http://localhost:3000 即可使用。

## 项目结构

```
src/
├── app/
│   ├── (app)/              # 需要登录的页面（含底部导航）
│   │   ├── page.tsx        # 首页 - 3D 花园 + check-in 入口
│   │   ├── check-in/       # check-in 流程页
│   │   ├── trends/         # 精力趋势图
│   │   └── settings/       # 设置页
│   ├── login/              # 登录页
│   ├── register/           # 注册页
│   └── api/
│       ├── auth/           # Auth.js 认证
│       ├── checkin/        # check-in 增删查
│       ├── trends/         # 趋势数据
│       ├── settings/       # 用户设置
│       └── register/       # 注册
├── components/
│   ├── garden/             # 3D 花园场景组件
│   ├── ui/                 # 基础 UI 组件
│   └── ...
├── db/
│   ├── schema.ts           # Drizzle 数据库 schema
│   └── index.ts            # 数据库连接
└── lib/
    ├── auth.ts             # Auth.js 配置
    ├── energy.ts           # 精力计算与统计
    ├── llm.ts              # 千问 LLM 集成
    ├── questions.ts        # 80 条 check-in 问题模板池
    └── utils.ts            # 工具函数
```

## 部署

### Vercel 部署

1. 将项目推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量：
   - `TURSO_DATABASE_URL` — Turso 数据库连接地址
   - `TURSO_AUTH_TOKEN` — Turso 认证令牌
   - `AUTH_SECRET` — Auth.js 密钥
   - `DASHSCOPE_API_KEY` — 千问 API Key
   - `DASHSCOPE_MODEL` — 千问模型名称（如 `qwen-plus`）
4. 部署

### Turso 数据库配置

```bash
# 安装 Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# 创建数据库
turso db create liubai

# 获取连接信息
turso db show liubai --url
turso db tokens create liubai

# 建表
pnpm drizzle-kit push
```

## 文档

- [产品方案文档](docs/product-plan.md) — 完整的产品规划、技术方案、运营策略
- [Check-in 问题模板](docs/checkin-questions.md) — 80 条分时段问题模板

## License

MIT
