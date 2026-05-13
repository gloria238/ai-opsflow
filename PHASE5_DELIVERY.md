# 🏗️ Phase 5 技术交付文档 — Internal Ops

> 可直接用于 Upwork/Fiverr 项目交付的完整架构与实现说明

---

## 📐 一、项目架构总览

```text
┌─────────────────────────────────────────────────────────────────────┐
│                       pnpm + Turborepo Monorepo                      │
│                                                                     │
│  apps/web (Next.js 14)                                              │
│  ┌───────────────────────────────────────────────┐                  │
│  │                                               │                  │
│  │  Dashboard (/)               Settings          │                  │
│  │  ├─ Org info card            ├─ General (名称) │                  │
│  │  ├─ Workflow/Lead counts     └─ Members (管理) │                  │
│  │  └─ Worker Status                                        │
│  │                                               │                  │
│  │  Runs (/runs)                Audit Log         │                  │
│  │  ├─ Status filter            (/audit-log)      │                  │
│  │  ├─ Pagination               ├─ Action log     │                  │
│  │  ├─ Retry failed             └─ Metadata view  │                  │
│  │  └─ Cancel running                            │                  │
│  │                                               │                  │
│  │  Sidebar (全站导航) + OrgSwitcher (组织切换)    │                  │
│  └───────────────────┬───────────────────────────┘                  │
│                      │                                              │
│                      ▼                                              │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  API Routes                                              │       │
│  │  ├─ PATCH /api/orgs/[slug]          (org 设置)           │       │
│  │  ├─ POST/PATCH/DELETE /members      (成员管理)           │       │
│  │  ├─ POST /orgs/[slug]/switch        (组织切换)           │       │
│  │  ├─ GET /runs + POST retry/cancel   (运行管理)           │       │
│  │  ├─ GET /audit-log                  (审计日志)           │       │
│  │  └─ GET /worker/health              (Worker 健康)       │       │
│  └─────────────────────────────────────────────────────────┘       │
│                      │                                              │
│                      ▼                                              │
│  apps/worker                     packages/db                        │
│  └─ 每轮写入 health JSON        └─ AuditLog 表已就绪              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 二、完整代码结构（按功能分组）

```
opsflow-ai/
│
├── 🔷 apps/web/app/(dashboard)/
│   ├── 📄 page.tsx                          ← [更新] 添加 WorkerStatusCard
│   ├── 📄 worker-status-card.tsx            ← [新增] Worker 状态卡片（轮询 /worker/health）
│   ├── 📄 layout.tsx                        ← [更新] 接入 OrgSwitcher
│   │
│   ├── 📁 settings/
│   │   ├── 📄 layout.tsx                    ← [新增] 设置页 tab 布局（General + Members）
│   │   ├── 📄 page.tsx                      ← [新增] 组织设置页（名称/slug 编辑）
│   │   ├── 📄 settings-general.tsx          ← [新增] 设置表单客户端组件
│   │   └── 📁 members/
│   │       ├── 📄 page.tsx                  ← [新增] 成员管理服务端壳
│   │       └── 📄 members-client.tsx        ← [新增] 成员管理客户端（增删改角色）
│   │
│   ├── 📁 runs/
│   │   └── 📄 page.tsx                      ← [新增] 全局运行管理面板
│   │
│   └── 📁 audit-log/
│       └── 📄 page.tsx                      ← [新增] 审计日志查看器
│
├── 🔷 apps/web/app/api/orgs/[slug]/
│   ├── 📄 route.ts                          ← [更新] 添加 PATCH（改名称/slug）
│   ├── 📁 switch/
│   │   └── 📄 route.ts                      ← [新增] POST 切换组织（重签 JWT）
│   ├── 📁 members/
│   │   ├── 📄 route.ts                      ← [更新] 添加 POST（添加成员）
│   │   └── 📁 [membershipId]/
│   │       └── 📄 route.ts                  ← [新增] PATCH 改角色 + DELETE 移除
│   ├── 📁 runs/
│   │   ├── 📄 route.ts                      ← [新增] GET 全局运行列表（分页+筛选）
│   │   └── 📁 [runId]/
│   │       ├── 📁 retry/
│   │       │   └── 📄 route.ts              ← [新增] POST 重试失败运行
│   │       └── 📁 cancel/
│   │           └── 📄 route.ts              ← [新增] POST 取消运行
│   ├── 📁 audit-log/
│   │   └── 📄 route.ts                      ← [新增] GET 审计日志（分页）
│   └── 📁 worker/
│       └── 📁 health/
│           └── 📄 route.ts                  ← [新增] GET Worker 健康状态
│
├── 🔷 apps/web/components/
│   ├── 📁 nav/
│   │   ├── 📄 sidebar.tsx                   ← [更新] 添加 Runs/Settings/Audit Log
│   │   └── 📄 sidebar-header.tsx            ← [新增] OrgSwitcher 包装组件
│   └── 📁 org/org-switcher.tsx              ← [已有] 组织切换下拉菜单
│
└── 🔷 apps/worker/src/
    └── 📄 index.ts                          ← [更新] 每轮写入 .worker-health.json
```

**文件数量统计**：新增 **14** 个源文件，修改 **6** 个。

---

## 🎯 三、功能详解

### 3.1 组织设置

**路径**: `/settings`

**功能**：
- 修改组织名称和 slug
- 仅 owner/admin 可编辑
- slug 唯一性校验（已占用返回 409）

**API**: `PATCH /api/orgs/[slug]`
```json
// 请求
{ "name": "New Name", "slug": "new-slug" }
// 响应
{ "id": "...", "name": "New Name", "slug": "new-slug" }
```

### 3.2 成员管理

**路径**: `/settings/members`

**功能**：
- 查看所有成员（name, email, role）
- 添加成员（输入 email + 选择角色）
- 修改角色（下拉选择）
- 移除成员（带确认弹窗）

**API**：
| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/orgs/[slug]/members` | 成员列表（已有） |
| POST | `/api/orgs/[slug]/members` | 添加成员 |
| PATCH | `/api/orgs/[slug]/members/[id]` | 改角色 |
| DELETE | `/api/orgs/[slug]/members/[id]` | 移除成员 |

**安全限制**：
- 不能移除最后一个 owner
- 不能降级最后一个 owner
- 需要 `manage_members` 权限

### 3.3 组织切换

**位置**: 侧边栏顶部（org 名区域）

**功能**：
- 如果用户有多个 org，显示下拉菜单
- 点击切换 → API 重签 JWT → 刷新页面
- 单 org 用户显示普通文本

**API**: `POST /api/orgs/[slug]/switch`
```text
验证成员身份 → signToken(新 org) → 设置 cookie → 返回
```

### 3.4 运行管理面板

**路径**: `/runs`

**功能**：
- 全局运行列表（所有工作流的 run）
- 按状态筛选（queued/running/completed/failed/dead_letter）
- 分页（20条/页）
- 重试 failed/dead_letter run
- 取消 queued/running run

**API**：
| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/orgs/[slug]/runs?status=&page=` | 全局运行列表 |
| POST | `/api/orgs/[slug]/runs/[id]/retry` | 重试（状态重置为 queued） |
| POST | `/api/orgs/[slug]/runs/[id]/cancel` | 取消（设为 failed） |

### 3.5 审计日志

**路径**: `/audit-log`

**功能**：
- 分页查看所有审计条目
- 显示：操作人、操作类型、目标类型、目标 ID、元数据（JSON）
- 操作类型按颜色区分（创建=绿、更新=蓝、删除=红）
- 元数据以可折叠 JSON 展示

**模型**：
```prisma
model AuditLog {
  organizationId String
  userId         String?
  userName       String?
  action         String    // "workflow.created", "lead.updated", "member.removed"
  targetType     String    // "Workflow", "Lead", "Membership"
  targetId       String?
  metadata       Json?
  createdAt      DateTime
  @@index([organizationId, createdAt(sort: Desc)])
}
```

**API**: `GET /api/orgs/[slug]/audit-log?page=&action=&targetType=`

### 3.6 Worker 可见性

**位置**: Dashboard 首页

**功能**：
- 显示 Worker 状态（running/unknown）
- 最后轮询时间
- 队列大小（queued/running/dead_letter）
- 每 10 秒自动刷新

**实现**：
- Worker 每轮写入 `.worker-health.json`
- API 读取该文件 + 查询 DB 队列计数
- Dashboard 客户端组件轮询 API

---

## 🗄️ 四、数据库变更

| 模型 | 变更 | 说明 |
|------|------|------|
| `AuditLog` | 新增 | 审计日志表（Phase 5 准备阶段已建） |

无其他 schema 变动。

---

## 📡 五、API 端点完整清单（Phase 5 新增/变更）

| 方法 | 路径 | 认证 | 权限 | 功能 |
|------|------|------|------|------|
| PATCH | `/api/orgs/[slug]` | 是 | manage_org | 更新组织名称/slug |
| POST | `/api/orgs/[slug]/switch` | 是 | - | 切换当前组织 |
| POST | `/api/orgs/[slug]/members` | 是 | manage_members | 添加成员 |
| PATCH | `/api/orgs/[slug]/members/[id]` | 是 | manage_members | 修改角色 |
| DELETE | `/api/orgs/[slug]/members/[id]` | 是 | manage_members | 移除成员 |
| GET | `/api/orgs/[slug]/runs` | 是 | view_workflows | 全局运行列表 |
| POST | `/api/orgs/[slug]/runs/[id]/retry` | 是 | manage_workflows | 重试运行 |
| POST | `/api/orgs/[slug]/runs/[id]/cancel` | 是 | manage_workflows | 取消运行 |
| GET | `/api/orgs/[slug]/audit-log` | 是 | manage_org | 审计日志 |
| GET | `/api/orgs/[slug]/worker/health` | 是 | view_workflows | Worker 健康状态 |

---

## 🔄 六、侧边栏导航

```
Dashboard  📊
Leads      👥
Workflows  ⚡
Runs       🔄        ← 新增
Settings   ⚙️        ← 新增
Audit Log  📋        ← 新增
```

---

## 💂 七、权限矩阵（Phase 5 相关）

| API | 所需权限 | 说明 |
|-----|---------|------|
| PATCH /orgs/[slug] | `manage_org` | owner/admin 才能改组织 |
| members/* | `manage_members` | owner/admin 才能管成员 |
| runs | `view_workflows` | 所有人都能看运行记录 |
| retry/cancel | `manage_workflows` | operator+ 才能操作运行 |
| audit-log | `manage_org` | owner/admin 才能看审计日志 |
| worker/health | `view_workflows` | 所有人都能看 worker 状态 |

---

## 📦 八、交付要点

### 文件统计

| 指标 | 数值 |
|------|------|
| Phase 5 源码行数 | ~800 行 |
| 新增源文件 | 14 个 |
| 修改文件 | 6 个 |
| API 端点 | 10 个（新增/变更） |
| 新页面 | 4 个（Settings + Members + Runs + Audit Log） |
| 数据库变更 | AuditLog 表（Phase 5 准备阶段已建） |

### 核心价值

1. **完整管理后台** — 组织设置 + 成员管理 + 审计日志，不再依赖直接操作数据库
2. **运行运维** — 全局运行视图 + 重试/取消，不用等了
3. **Worker 可见性** — Dashboard 上实时看到 Worker 状态和队列大小
4. **组织切换** — 多 org 用户可直接在 UI 切换
5. **安全防护** — 最后 owner 保护、RBAC 全覆盖、所有操作可审计
