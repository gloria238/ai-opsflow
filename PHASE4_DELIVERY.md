# 🏗️ Phase 4 技术交付文档 — AI Layer

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
│  │  lib/ai.ts + lib/prompts.ts                   │                  │
│  │    ┌──────────┐                               │                  │
│  │    │callDeep  │── fetch ──► DeepSeek API      │                  │
│  │    │Seek()    │    (server-side only)          │                  │
│  │    └──────────┘                               │                  │
│  │         │                                     │                  │
│  │         ▼                                     │                  │
│  │  ┌──────────────┐    ┌──────────────────┐     │                  │
│  │  │ AI API Routes│    │ Workflow Builder │     │                  │
│  │  │ suggest-nodes├───►│ AI Suggestions   │     │                  │
│  │  │generate-wf   ├───►│ NL → Workflow    │     │                  │
│  │  │ score-lead   ├───►│ Lead Scoring UI  │     │                  │
│  │  │ analyze-run  ├───►│ Anomaly Display  │     │                  │
│  │  └──────┬───────┘    └──────────────────┘     │                  │
│  │         │                                     │                  │
│  │         ▼                                     │                  │
│  │  ┌────────────┐                               │                  │
│  │  │  Prisma DB │                               │                  │
│  │  └────────────┘                               │                  │
│  └───────────────────────────────────────────────┘                  │
│                                                                     │
│  架构变化: Phase 1-3              Phase 4                            │
│  浏览器 → API Route → DB         浏览器 → API Route → ─┬─ DB          │
│                                                         └─ DeepSeek  │
└─────────────────────────────────────────────────────────────────────┘
```

**核心原则**：所有 AI 调用在服务端的 API Route 中执行，API Key 从 `.env` 读取，永不暴露给浏览器。

---

## 📁 二、完整代码结构（按功能分组）

```
opsflow-ai/
│
├── 🔷 apps/web/lib/                          ← Phase 4 新增
│   ├── 📄 ai.ts                              ← DeepSeek API 客户端（callDeepSeek, callDeepSeekJSON）
│   └── 📄 prompts.ts                         ← 所有 prompt 模板（4 组 system + builder）
│
├── 🔷 apps/web/components/
│   ├── 📁 workflow/
│   │   ├── 📄 ai-suggestions-panel.tsx       ← [新增] 左侧边栏 AI 建议面板
│   │   ├── 📄 ai-workflow-generator.tsx      ← [新增] 画布上方 NL 生成器
│   │   ├── 📄 canvas.tsx                     ← [修改] 集成 AI 面板 + orgSlug 参数
│   │   └── 📄 types.ts                       ← [修改] 添加 AI 类型定义
│   └── 📁 leads/
│       └── 📄 ai-insights-card.tsx           ← [新增] Lead 详情页 AI 评分卡
│
├── 🔷 apps/web/app/api/orgs/[slug]/ai/       ← Phase 4 新增 API 目录
│   ├── 📁 suggest-nodes/
│   │   └── 📄 route.ts                       ← POST: AI 节点建议
│   ├── 📁 generate-workflow/
│   │   └── 📄 route.ts                       ← POST: 自然语言生成工作流
│   ├── 📁 score-lead/
│   │   └── 📄 route.ts                       ← POST: AI 线索评分
│   └── 📁 analyze-run/
│       └── 📄 route.ts                       ← POST: 异常运行分析
│
├── 🔷 apps/web/app/(dashboard)/
│   ├── 📁 workflows/[id]/builder/
│   │   └── 📄 builder-client.tsx             ← [修改] 集成 AI 生成器
│   ├── 📁 workflows/[id]/
│   │   └── 📄 run-view.tsx                   ← [修改] 添加异常分析按钮
│   ├── 📁 leads/
│   │   ├── 📄 lead-table-client.tsx          ← [修改] 添加 AI Score 列
│   │   └── 📁 [id]/
│   │       └── 📄 page.tsx                   ← [修改] 添加 AI Insights 卡片
│
└── 📄 PHASE4_DELIVERY.md                     ← 本文档
```

**文件数量统计**：新增 **8** 个源文件，修改 **5** 个。

---

## 🧠 三、AI 基础设施详解

### 3.1 `lib/ai.ts` — DeepSeek API 客户端

```
callDeepSeek(prompt, system?, options?)
    │ fetch POST https://api.deepseek.com/v1/chat/completions
    │ Authorization: Bearer ${DEEPSEEK_API_KEY}
    ▼
  返回 string (AI 文本回复)

callDeepSeekJSON<T>(prompt, system?, options?)
    │ 调用 callDeepSeek
    │ 清洗 markdown 代码块
    │ JSON.parse
    ▼
  返回 T (类型安全的 JSON 结构)
```

**设计要点**：
- 自定义 `AIClientError` 错误类，含 `statusCode` 和 `retryable` 标识
- `callDeepSeekJSON` 自动去除 LLM 常输出的 ` ```json ` 代码块包裹
- API key 在调用时从 `process.env.DEEPSEEK_API_KEY` 读取（延迟读取而非 import 时读取）
- `temperature` 默认值：JSON 模式 0.3，文本模式 0.7
- 零外部依赖 — 使用 Node 18+ 内置 `fetch`
- 模型：`deepseek-chat`（DeepSeek V3）

### 3.2 `lib/prompts.ts` — Prompt 模板

| 模板 | system prompt | builder 函数 | 用途 |
|------|-------------|-------------|------|
| `NODE_SUGGESTION_SYSTEM` | 工作流自动化专家 | `buildNodeSuggestionPrompt()` | 根据现有节点建议后续节点 |
| `WORKFLOW_GENERATION_SYSTEM` | 工作流设计专家 | `buildWorkflowGenerationPrompt()` | 自然语言生成工作流图 |
| `LEAD_SCORING_SYSTEM` | CRM 评分 AI | `buildLeadScoringPrompt()` | 评估线索转化概率 |
| `ANOMALY_ANALYSIS_SYSTEM` | 工作流调试器 | `buildAnomalyAnalysisPrompt()` | 分析失败运行根因 |

---

## 🎯 四、功能详解

### 4.1 AI 工作流节点建议

**流程**：
```text
用户点击 "Suggest Nodes" 按钮
    │
    ▼
[AISuggestionsPanel] 发送当前 nodes/edges 到 API
    │ POST /api/orgs/{slug}/ai/suggest-nodes
    │ { nodes: [...], edges: [...], nodeConfig?: { type: "..." } }
    ▼
[API Route] 校验 session → membership → permission (manage_workflows)
    │ callDeepSeekJSON(prompt, NODE_SUGGESTION_SYSTEM, temp: 0.5)
    ▼
[DeepSeek] 返回 3-5 条建议
    │ 过滤非法 type，限制 5 条
    ▼
[UI] 渲染建议列表
    │ 每条: 类型标签 + 名称 + 理由 + [Add to Canvas]
    ▼
用户点击 "Add to Canvas"
    │ createNode 新节点
    ▼
[Canvas] setNodes → 节点出现在画布上
```

**建议类型颜色**：
- trigger → 绿色徽标
- action → 蓝色徽标
- condition → 琥珀色徽标
- delay → 紫色徽标

**优先级视觉**：
- high → 蓝色边框
- medium → 灰色边框
- low → 半透明

**状态覆盖**：
- Loading: "Getting AI suggestions..."
- Empty: "Click 'Suggest' to get AI recommendations"
- Error: 红色提示 + Retry 按钮

### 4.2 自然语言 → 工作流

**流程**：
```text
用户展开 "Generate with AI" 区域
    │ 输入："当有新 Lead 创建时..."
    ▼
[AIWorkflowGenerator]
    │ POST /api/orgs/{slug}/ai/generate-workflow
    │ { description: "..." }
    ▼
[API Route]
    ├─ 校验 description（必填、≤2000 字符）
    ├─ callDeepSeekJSON(prompt, WORKFLOW_GENERATION_SYSTEM, temp: 0.4)
    ├─ 验证 nodes（至少 1 个有效节点）
    ├─ 将 AI 返回的 index 引用转换为真实 UUID
    └─ 返回 { nodes: [...], edges: [...] }
    ▼
[builder-client.tsx] setWorkflow 替换画布内容
    │ canvas remount → 新 nodes/edges 渲染
    ▼
用户可继续编辑、保存
```

**AI 返回值到画布的映射**：
```text
AI 返回: nodes[0], nodes[1], nodes[2]
        edges: [{ source: "0", target: "1" }, { source: "1", target: "2" }]
    ▼
服务端分配: node_abc, node_def, node_ghi
           edges: [{ source: "node_abc", target: "node_def" }, ...]
    ▼
画布渲染
```

**位置布局**：AI 返回位置或默认垂直排列（间隔 200px）

**状态覆盖**：
- Loading: "Generating..." + 禁用输入
- Empty 结果: "AI generated an empty workflow. Try a more detailed description."
- 验证错误: "description is required" / "too long"
- API 错误: 502 + 错误详情

### 4.3 智能 Lead 评分

**数据流**：
```text
Lead 列表页                          Lead 详情页
───────────                          ──────────
[Score] 按钮 → POST /ai/score-lead   [AI Insights Card]
    │ { leadId }                          │ 组件挂载时自动 POST
    ▼                                     ▼
[API Route]                           [API Route]
    ├─ 查 DB 获取 lead 详情               ├─ 同左
    ├─ callDeepSeekJSON                 ├─ 同左
    └─ 返回 { score, label, reason }     └─ 同左
    ▼                                     ▼
[Table] 显示评分徽标                    [Card] 显示评分圆环 + 下一步建议
    hot(75+)  → 红色                    ┌──────────┐
    warm(40+) → 黄色                    │   85     │
    cold(0+)  → 灰色                    │  HOT     │
                                        │  ...     │
每个按钮按需触发                        │ 建议下一步 │
"Score All" 批量触发                      └──────────┘
```

**API 设计**：支持两种输入模式
- `leadId` — 从 DB 加载 lead 数据
- `name`/`email`/`stage` — 直接传入数据（不查 DB）

**状态覆盖**：
- Table cell: "Score" 链接 / "Scoring..." / 分数徽标
- Detail card: "Analyzing..." / "Unable to analyze" / 评分 + 建议
- 防重复: `scoringIds` Set 防止同一 lead 重复评分

### 4.4 异常检测

**流程**：
```text
WorkflowRun 状态为 failed / dead_letter
    │
    ▼ 用户点击 "Analyze with AI"
    │ POST /api/orgs/{slug}/ai/analyze-run
    │ { runId }
    ▼
[API Route]
    ├─ 查 run + events
    ├─ 校验 run 属于当前组织
    ├─ 校验 run 状态是 failed/dead_letter
    └─ callDeepSeekJSON → { rootCause, failedNode, suggestedFix, isTransient }
    ▼
run-view.tsx 渲染分析结果:
┌─────────────────────────────────────┐
│ Root cause: Lead scoring API returned 500 error, causing the "Update Lead" action node to fail. This appears to be a transient API failure. │
│                                     │
│ Suggested fix: Check the lead scoring service health. Consider adding retry logic (maxRetries: 2) to the action node for transient failures. │
└─────────────────────────────────────┘
```

**组织隔离**：查 run 后额外校验 `run.workflowVersion.workflow.organizationId`

**状态覆盖**：
- Loading: "Analyzing..."
- Empty: N/A（按钮只在失败 run 显示）
- Error: 智能跳过（不影响页面）

---

## 🗄️ 五、数据库变更

无。Phase 4 不修改 Schema，AI 分析结果通过 existing 的 `WorkflowRunEvent.output`（Json 字段）或前端本地状态展示。

---

## 📡 六、API 端点完整清单（Phase 4 新增）

| 方法 | 路径 | 认证 | 权限 | 功能 | 输入 | 输出 |
|------|------|------|------|------|------|------|
| POST | `/api/orgs/[slug]/ai/suggest-nodes` | 是 | manage_workflows | AI 节点建议 | `{ nodes, edges, nodeConfig? }` | `{ suggestions: [...] }` |
| POST | `/api/orgs/[slug]/ai/generate-workflow` | 是 | manage_workflows | NL 生成工作流 | `{ description }` | `{ nodes: [...], edges: [...] }` |
| POST | `/api/orgs/[slug]/ai/score-lead` | 是 | view_leads | 线索评分 | `{ leadId }` 或 `{ name, email, stage }` | `{ score, label, reason, nextAction }` |
| POST | `/api/orgs/[slug]/ai/analyze-run` | 是 | view_workflows | 异常分析 | `{ runId }` | `{ rootCause, failedNode, suggestedFix, isTransient }` |

所有 AI API 返回 502 当 DeepSeek 不可用，返回 422 当 AI 生成结果为空/无效。

---

## ⚙️ 七、环境变量

```bash
# .env（根目录，Phase 4 新增一行）
DEEPSEEK_API_KEY=sk-your-key-here   # DeepSeek API Key
```

已在 `.env` 中存在。

---

## 🛡️ 八、权限矩阵（Phase 4 相关）

| API | 所需权限 | 说明 |
|-----|---------|------|
| suggest-nodes | `manage_workflows` | 编辑工作流权限 |
| generate-workflow | `manage_workflows` | 编辑工作流权限 |
| score-lead | `view_leads` | 只读分析，不需要管理权限 |
| analyze-run | `view_workflows` | 只读分析 |

---

## 🚨 九、错误处理

### AI 特有错误

| 错误场景 | HTTP 状态码 | 用户看到 |
|---------|------------|---------|
| DEEPSEEK_API_KEY 未配置 | 500 (服务端) | "Suggestion failed" |
| DeepSeek API 429 (限流) | 502 | "Rate limited, try again" |
| DeepSeek API 5xx | 502 | "AI service temporarily unavailable" |
| AI 返回无效 JSON | 502 | 原始错误信息（前 200 字符） |
| AI 返回空结果 | 422 | "AI generated an empty workflow..." |
| description 超过 2000 字符 | 400 | "description too long" |
| description 为空 | 400 | "description is required" |

### 现有错误处理继承

所有 AI API Route 复用 Phase 1-3 的 3 层安全校验：
1. `getSession()` → 401 Unauthorized
2. `membership.findFirst()` → 404 Not found
3. `requirePermission()` → 403 Forbidden

---

## 📊 十、代码质量指标

| 指标 | 数值 |
|------|------|
| Phase 4 源码行数 | ~650 行 |
| 新增源文件 | 8 个 |
| 修改文件 | 5 个 |
| API 端点 | 4 个（AI 专用） |
| DeepSeek 调用模式 | JSON + 文本，4 种 prompt |
| 前端组件 | 4 个新 UI 组件 |
| 数据库变更 | 无 |

---

## 🌟 十一、交付要点（面向 Upwork/Fiverr 客户）

### 核心价值

1. **零架构变更** — 所有 AI 跑在现有 API Route 里，不需要额外后端、队列或部署变更
2. **Key 安全** — `DEEPSEEK_API_KEY` 在 `.env`，服务端调用，浏览器不可见
3. **按需付费** — 每条 AI 调用精准控制（手动触发），不浪费配额
4. **优雅降级** — AI 不可用时，现有功能完全不受影响

### 后续扩展

- **人机协作** — 用户确认 AI 建议后再执行
- **批量评分** — 定时任务批量 AI 评分所有 Lead
- **Worker 自愈** — Worker 自动调 AI 分析失败 + 自动重试
- **历史分析** — 所有 AI 结果存入 DB 形成分析历史
