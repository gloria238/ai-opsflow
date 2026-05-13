# 🏗️ Phase 3 技术交付文档 — Workflow Engine

> 可直接用于 Upwork/Fiverr 项目交付的完整架构与实现说明

---

## 📐 一、项目架构总览

```text
┌─────────────────────────────────────────────────────────────────────┐
│                       pnpm + Turborepo Monorepo                      │
│                                                                     │
│  apps/web (Next.js 14)              apps/worker (Node.js)           │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐ │
│  │  Workflow Builder Canvas     │  │  DAG Worker Engine           │ │
│  │  ├─ React Flow (drag/drop)   │  │  ├─ Topological Sort         │ │
│  │  ├─ 4 Custom Node Types      │  │  ├─ Condition Evaluation     │ │
│  │  ├─ Node Config Panel        │  │  ├─ Delay Node (cross-poll)  │ │
│  │  └─ Run History Overlay      │  │  └─ Retry + Dead Letter      │ │
│  │                              │  │                              │ │
│  │  Pages (RSC/Client)          │  │  Polls every 5s              │ │
│  │  ├─ Workflow List + Create   │  │  Processes queued + running  │ │
│  │  ├─ Workflow Detail + Run    │  └──────────┬───────────────────┘ │
│  │  └─ Builder (full-screen)    │             │                     │
│  │                              │             │                     │
│  │  API Route Handlers          │             │                     │
│  │  ├─ GET/POST workflows       │             │                     │
│  │  ├─ GET/PUT/DELETE [id]      │             │                     │
│  │  ├─ POST trigger             │             │                     │
│  │  └─ GET runs                 │             │                     │
│  └──────────────┬───────────────┘             │                     │
│                 │                             │                     │
│                 └──────────┬──────────────────┘                     │
│                            ▼                                       │
│                  packages/db (Prisma 6)                             │
│            ┌──────────────────────────────────┐                    │
│            │  Database Client Singleton        │                    │
│            │  Schema: 10 models + 1 enum       │                    │
│            │  Seed: 2 demo workflows           │                    │
│            └──────────────┬───────────────────┘                    │
│                           ▼                                        │
│                   PostgreSQL (Supabase)                             │
└─────────────────────────────────────────────────────────────────────┘
```

**Phase 3 新增的执行路径**：

```text
Design Time (用户设计流程)
  Builder Page (/workflows/[id]/builder)
    ├─ NodePalette (左侧拖拽面板)
    │     drag & drop
    ▼
  Canvas (React Flow 画布)
    │     node click
    ▼
  NodeConfigPanel (右侧配置面板)
    │     save
    ▼
  PUT /api/.../workflows/[id] → 创建新版本 → DB

Runtime (执行流程)
  TriggerButton "Run Now" → POST /api/.../trigger → WorkflowRun(queued)
    │
    ▼ poll every 5s
  Worker → DAG拓扑排序 → 条件求值 → 按序执行 → completed/failed/dead_letter
    │
    ▼ poll every 3s
  RunView / RunSelector → GET /api/.../runs → 实时状态更新
```

---

## 📁 二、完整代码结构（按功能分组）

```
opsflow-ai/
│
├── 🔷 apps/web/
│   ├── 📁 components/
│   │   └── 📁 workflow/                          ← Phase 3 新增：Workflow Builder Canvas
│   │       ├── 📄 types.ts                       ← 共享类型定义（NodeType, WorkflowNodeData, RunNodeStatus）
│   │       ├── 📄 canvas.tsx                     ← React Flow 画布主组件（Provider + InnerCanvas）
│   │       ├── 📄 node-palette.tsx               ← 左侧拖拽面板（4种节点类型）
│   │       ├── 📄 node-config-panel.tsx          ← 右侧节点配置面板（类型感知表单）
│   │       ├── 📄 toolbar.tsx                    ← 顶部工具栏（名称编辑、缩放、保存）
│   │       ├── 📄 run-selector.tsx               ← 运行历史下拉选择器 + 状态叠加层
│   │       └── 📁 nodes/                         ← 自定义节点渲染组件
│   │           ├── 📄 trigger-node.tsx           ← 触发器节点（绿色，1 output handle）
│   │           ├── 📄 action-node.tsx            ← 动作节点（蓝色，input + output）
│   │           ├── 📄 condition-node.tsx         ← 条件节点（琥珀色菱形，yes/no handles）
│   │           └── 📄 delay-node.tsx             ← 延迟节点（紫色，input + output）
│   │
│   ├── 📁 app/(dashboard)/
│   │   └── 📁 workflows/
│   │       ├── 📄 page.tsx                       ← [更新] 添加创建按钮 + 组织slug
│   │       ├── 📄 create-button.tsx              ← [新增] 创建工作流对话框
│   │       └── 📁 [id]/
│   │           ├── 📄 page.tsx                   ← [更新] 添加Open Builder + Run Now
│   │           ├── 📄 trigger-button.tsx         ← [新增] "Run Now"按钮组件
│   │           ├── 📄 run-view.tsx               ← [已有] 运行列表轮询视图
│   │           └── 📁 builder/
│   │               ├── 📄 page.tsx               ← [新增] 构建器页面服务端壳
│   │               └── 📄 builder-client.tsx     ← [新增] 构建器客户端逻辑
│   │
│   └── 📁 app/api/orgs/[slug]/workflows/
│       ├── 📄 route.ts                           ← [更新] GET列表 + POST创建（含初始版本）
│       ├── 📁 [id]/
│       │   └── 📄 route.ts                       ← [新增] GET详情 + PUT保存图 + DELETE
│       ├── 📁 [id]/trigger/
│       │   └── 📄 route.ts                       ← [新增] POST触发运行
│       └── 📁 [id]/runs/
│           └── 📄 route.ts                       ← [已有] GET运行记录列表
│
├── 🔷 apps/worker/
│   └── 📁 src/
│       └── 📄 index.ts                           ← [重写] DAG引擎（拓扑排序+条件+延迟+重试+死信）
│
├── 🔷 packages/db/
│   └── 📁 prisma/
│       ├── 📄 schema.prisma                      ← [更新] +WorkflowNode.label, +WorkflowEdge.sourceHandle
│       └── 📄 seed.ts                            ← [更新] 2个demo工作流（含标签）
│
└── 📄 PHASE3_DELIVERY.md                         ← 本文档
```

**文件数量统计**：新增 **14** 个源文件，修改 **8** 个，重写 **1** 个。

---

## 🗄️ 三、数据库 Schema 变更

### 3.1 新增/变更列

| 模型 | 列 | 类型 | 用途 |
|------|----|------|------|
| `WorkflowNode` | `label` | `String?` | 用户自定义节点名称（保存/加载后保留） |
| `WorkflowEdge` | `sourceHandle` | `String?` | 源节点句柄 ID，条件分支时值为 `"true"`/`"false"` |

### 3.2 核心模型关系（Phase 3 关注部分）

```text
Workflow (组织级)
  │
  ├── WorkflowVersion (版本不可变)
  │     ├── WorkflowNode (图节点)
  │     │     ├── id: String (UUID)
  │     │     ├── type: String (trigger|action|condition|delay)
  │     │     ├── label: String?          ← Phase 3 新增
  │     │     ├── config: Json (节点特定配置)
  │     │     ├── positionX: Float
  │     │     └── positionY: Float
  │     │
  │     ├── WorkflowEdge (有向边)
  │     │     ├── id: String (UUID)
  │     │     ├── sourceNodeId: String
  │     │     ├── targetNodeId: String
  │     │     └── sourceHandle: String?   ← Phase 3 新增
  │     │
  │     └── WorkflowRun (执行实例)
  │           ├── id: String (UUID)
  │           ├── status: String (queued|running|completed|failed|dead_letter)
  │           ├── input: Json? (运行输入数据)
  │           ├── idempotencyKey: String?
  │           └── WorkflowRunEvent[] (节点执行事件)
  │                 ├── id: String
  │                 ├── nodeId: String
  │                 ├── status: String (success|failed|delayed)
  │                 ├── input: Json
  │                 └── output: Json?
  │
  └── 属于 Organization（多租户隔离）
```

### 3.3 状态机

```text
WorkflowRun 状态流转：

                    ┌─────────┐
                    │ queued  │
                    └────┬────┘
                         │ Worker picks up
                         ▼
                    ┌─────────┐
              ┌────>│ running │<────┐
              │     └────┬────┘     │
              │          │          │
              │    ┌─────┴─────┐    │
              │    │           │    │
              │    ▼           ▼    │
              │ ┌──────┐  ┌───────┐ │
              │ │delay │  │fail+  │ │
              │ │wait  │  │retry  ├─┘
              │ └──────┘  └───────┘
              │
         all done     retries exhausted
              │              │
              ▼              ▼
        ┌───────────┐  ┌────────────┐
        │ completed │  │dead_letter │
        └───────────┘  └────────────┘

节点状态（运行可视化用）：
  success → green ring
  failed  → red ring
  running → blue pulsing
  delayed → amber dashed
  pending → 50% opacity
```

---

## 🧠 四、Worker DAG 引擎详解

### 4.1 拓扑排序（Kahn's Algorithm）

```typescript
function topologicalSort(nodes, edges) {
  // 1. 计算所有节点的入度
  const inDegree = new Map<id, number>();
  const adjacency = new Map<id, id[]>();
  
  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adjacency.set(n.id, []);
  }
  for (const e of edges) {
    adjacency.get(e.sourceNodeId)!.push(e.targetNodeId);
    inDegree.set(e.targetNodeId, (inDegree.get(e.targetNodeId) ?? 0) + 1);
  }

  // 2. 从入度为 0 的节点开始 BFS
  const queue = [...inDegree].filter(([_, d]) => d === 0).map(([id]) => id);
  const sorted = [];

  while (queue.length) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const nb of adjacency.get(id) ?? []) {
      inDegree.set(nb, inDegree.get(nb)! - 1);
      if (inDegree.get(nb) === 0) queue.push(nb);
    }
  }

  return sorted.map(id => nodeMap.get(id));
}
```

**设计要点**：
- 基于 BFS，时间复杂度 O(V + E)
- 能检测循环依赖（结果长度 < 节点数时说明有环）
- 先执行所有前置节点，再执行后续节点

### 4.2 条件求值

```typescript
function evaluateCondition(config, input) {
  // config: { field: "lead.email", operator: "contains", value: "@company.com" }
  
  // 使用点号表示法取值: "lead.email" → input.lead.email
  let value = input;
  for (const key of field.split(".")) {
    value = value?.[key];
  }

  // 支持的操作符
  switch (operator) {
    case "equals":       return actual === expected ? "true" : "false";
    case "not_equals":   return actual !== expected ? "true" : "false";
    case "contains":     return actual.includes(expected) ? "true" : "false";
    case "greater_than": return Number(actual) > Number(expected) ? "true" : "false";
    case "less_than":    return Number(actual) < Number(expected) ? "true" : "false";
  }
}
```

### 4.3 分支活动节点集

拓扑排序后，Worker 还需确定**哪些节点实际上可达**：

```text
输入: trig → condition(lead.email contains "@company")
              ├── true  → update_lead (hot lead)
              └── false → send_email (nurture)
                           └── delay(1 day)

当 lead.email = "alice@company.com":
  活动节点: [trig, condition, update_lead]  ← cold 分支被跳过

当 lead.email = "alice@gmail.com":
  活动节点: [trig, condition, send_email, delay]  ← hot 分支被跳过
```

**算法**: 取拓扑排序结果，按序遍历，跟踪活跃集；遇到 condition 节点时，只把匹配 edge.target 加入活跃集。

### 4.4 延迟节点（跨轮询周期）

```text
第一次轮询到达 delay 节点:
  1. 创建 WorkflowRunEvent(status: "delayed", createdAt: now())
  2. 返回，保留 run 为 running 状态

第二次轮询（5秒后）:
  1. 发现 delay 节点有 "delayed" 事件
  2. 计算 elapsed = now() - delayedEvent.createdAt
  3. 如果 elapsed < duration → 返回（下个轮询再来）
  4. 如果 elapsed >= duration → 创建 success 事件，继续执行后续节点
```

### 4.5 重试与死信机制

```typescript
const maxRetries = node.config.maxRetries ?? 0;
let attempt = 0;

while (attempt <= maxRetries) {
  try {
    const output = await executeNode(node, input);
    await createEvent(run.id, node.id, "success", ...);
    break;  // 成功 → 继续下一个节点
  } catch (err) {
    attempt++;
    if (attempt <= maxRetries) {
      await createEvent(run.id, node.id, "failed", { error: String(err), attempt });
      // 返回，下个轮询周期重试
      return;
    }
  }
}

// 重试耗尽
await createEvent(run.id, node.id, "failed", { error: String(err), maxRetries });
await prisma.workflowRun.update({
  where: { id: run.id },
  data: { status: "dead_letter", finishedAt: new Date() },
});
```

---

## 🎨 五、Workflow Builder Canvas 架构

### 5.1 React Flow 集成

**依赖**: `@xyflow/react` ^12.10.2

**Provider 层级**:
```tsx
<ReactFlowProvider>    ← 提供画布上下文（screenToFlowPosition 等）
  <ReactFlow            ← 主画布组件
    nodes={nodes}
    edges={edges}
    nodeTypes={customNodeTypes}  ← 注册自定义节点
    onConnect={handleConnect}
    onDrop={handleDrop}          ← 拖放创建节点
    snapToGrid
    snapGrid={[20, 20]}
    fitView
  >
    <Background />     ← 网格背景
    <Controls />       ← 缩放控件
    <MiniMap />        ← 缩略图
  </ReactFlow>
</ReactFlowProvider>
```

### 5.2 拖拽创建节点流程

```text
NodePalette 中每个条目设置了 draggable
    │ onDragStart → event.dataTransfer.setData("application/node-type", type)
    ▼
Canvas (onDragOver) → event.preventDefault()  // 允许放置
    │
    ▼
Canvas (onDrop)
    ├─ dataTransfer.getData("application/node-type")  → type
    ├─ screenToFlowPosition({ x: event.clientX, y: event.clientY })  → position
    └─ createNode(type, position) → 新节点 → setNodes
```

### 5.3 自定义节点渲染

每个节点组件接收 `NodeProps<WorkflowNodeData>`，通过 `data._runStatus` 响应运行可视化：

```tsx
const statusStyles = {
  success: "!border-emerald-500 !ring-2 !ring-emerald-200",
  failed:  "!border-red-500 !ring-2 !ring-red-200",
  running: "!border-blue-500 !ring-2 !ring-blue-200 animate-pulse",
  delayed: "!border-amber-400 !border-dashed",
  pending: "!opacity-50",
};

function ActionNode({ data }: Props) {
  const status = data._runStatus;
  return (
    <div className={`rounded-xl border-2 border-blue-400 bg-white shadow-sm 
                     min-w-[180px] transition-all
                     ${status ? statusStyles[status] ?? "opacity-50" : ""}`}>
      {/* ... */}
    </div>
  );
}
```

### 5.4 节点配置面板

| 节点类型 | 可配置字段 | 表单组件 |
|----------|-----------|----------|
| Trigger | `type` (manual/webhook/schedule), `cron` | select + conditional input |
| Action | `action` (send_email/update_lead/create_lead/...) | select |
| Condition | `field`, `operator`, `value` | input + select + input |
| Delay | `duration`, `unit` (minutes/hours/days) | number input + select |

### 5.5 版本化保存

每次点击 Save：
1. 读取当前 nodes 和 edges
2. 查询最新 version 号（`WorkflowVersion.version`）
3. 创建新 `WorkflowVersion`（version = last + 1）
4. 新建所有 `WorkflowNode` + `WorkflowEdge` 关联到新版本
5. 更新 `Workflow.name` / `description`

**设计原则**：版本不可变 —— 一旦创建就不修改。历史版本可回溯，新运行使用最新版本。

---

## 🔄 六、完整数据流

### 6.1 创建工作流 → 设计 → 保存

```text
用户点击 "New Workflow" 按钮
    │
    ▼
[create-button.tsx]                   客户端
    │ POST /api/orgs/{slug}/workflows
    │ { name: "My Workflow", description: "..." }
    ▼
[api/.../workflows/route.ts]          POST handler
    ├─ 校验 session + permission (manage_workflows)
    ├─ Workflow.create + WorkflowVersion.create({ version: 1 })
    └─ 返回 201 + workflow
    │
    ▼
[create-button.tsx]                   客户端
    router.push(`/workflows/${wf.id}/builder`)
    ▼
[builder/page.tsx]                    服务端
    ├─ getSession() → 重定向检查
    ├─ Workflow.findFirst({ include: versions })
    └─ 渲染 BuilderClient
    │
    ▼
[builder-client.tsx]                  客户端
    ├─ useEffect → fetch(`/api/.../workflows/${id}`)
    ├─ 解析 nodes/edges → CanvasWorkflow 格式
    └─ 渲染 WorkflowCanvas
    │
    ▼
    用户在画布设计流程...
    │ 拖入节点 → 连接边 → 配置参数
    ▼
    点击 Save
    │
    ▼
[canvas.tsx] → handleSave()
    │ PUT /api/.../workflows/${id}
    │ { name, nodes: [...], edges: [...] }
    ▼
[api/.../workflows/[id]/route.ts]     PUT handler
    ├─ 校验 session + permission
    ├─ $transaction:
    │   ├─ Workflow.update (name/description)
    │   ├─ WorkflowVersion.create (version +1)
    │   ├─ WorkflowNode.create (每个节点)
    │   └─ WorkflowEdge.create (每条边)
    └─ 返回新版本
```

### 6.2 触发运行 → 执行 → 完成

```text
用户点击 "Run Now"
    │
    ▼
[trigger-button.tsx]                  客户端
    │ POST /api/.../workflows/${id}/trigger
    ▼
[trigger/route.ts]                    POST handler
    ├─ 校验 session + permission (run_workflows)
    ├─ WorkflowVersion.findFirst (最新版本)
    └─ WorkflowRun.create({ status: "queued", versionId })
    │
    ▼
[Worker 轮询]                         每 5 秒
    ├─ WorkflowRun.findMany({ status: "queued" })
    ├─ WorkflowRun.findMany({ status: "running" })
    │
    ▼ 处理每个 run
    ├─ status → "running", startedAt = now()
    ├─ 拓扑排序 nodes
    ├─ 条件求值 → 活跃节点集
    │
    ▼ 按拓扑序执行活跃节点
    ├─ 跳过已成功节点
    ├─ delay 节点 → 已等待够久？→ 继续
    │              → 还没到？→ 创建 delayed 事件 + 返回
    ├─ 执行节点 → 成功 → 创建 success 事件
    │            → 失败 + 有重试次数 → 创建 failed 事件 + 返回
    │            → 失败 + 无重试 → dead_letter + 停止
    │
    ▼ 全部节点完成
    └─ status → "completed", finishedAt = now()
    │
    ▼
[客户端轮询]                           每 3 秒
    run-view.tsx → GET /api/.../runs → 渲染最新状态
    run-selector.tsx → 用户可选中运行 → canvas 高亮节点
```

### 6.3 运行可视化

```text
用户在 Builder 页面
    │
    ▼
[run-selector.tsx]                   客户端
    ├─ useEffect → fetch(`/api/.../runs`)
    ├─ 渲染下拉列表（最近20条运行）
    │
    ▼ 用户选择一条运行
    ├─ 构建 Map<nodeId, status>:
    │   events.filter(success|failed|delayed) → map
    └─ onSelect(map)
    │
    ▼
[builder-client.tsx]
    setNodeStatuses(map)
    │
    ▼
[canvas.tsx]
    ├─ 监听到 nodeStatuses 变化
    ├─ 遍历所有节点:
    │   ├─ nodeStatuses.has(node.id) → data._runStatus = status
    │   └─ nodeStatuses && !has(node.id) → data._runStatus = "pending"
    └─ setNodes(更新后的节点)
    │
    ▼
[自定义节点组件]
    读取 data._runStatus → 应用 CSS 样式
    success → 绿色边框 + 绿色光环
    failed  → 红色边框 + 红色光环
    running → 蓝色边框 + 脉冲动画
    delayed → 琥珀色虚线边框
    pending → 50% 透明度
```

---

## 📡 七、API 端点完整清单（Phase 3 新增/变更）

| 方法 | 路径 | 认证 | 权限 | 功能 |
|------|------|------|------|------|
| GET | `/api/orgs/[slug]/workflows` | 是 | view_workflows | 工作流列表（支持 search） |
| POST | `/api/orgs/[slug]/workflows` | 是 | manage_workflows | 创建工作流（含 v1 版本） |
| GET | `/api/orgs/[slug]/workflows/[id]` | 是 | view_workflows | 工作流详情 + 最新版本图 |
| PUT | `/api/orgs/[slug]/workflows/[id]` | 是 | manage_workflows | 保存图谱（创建新版本） |
| DELETE | `/api/orgs/[slug]/workflows/[id]` | 是 | manage_workflows | 删除工作流 |
| POST | `/api/orgs/[slug]/workflows/[id]/trigger` | 是 | run_workflows | 触发运行（创建 queued run） |
| GET | `/api/orgs/[slug]/workflows/[id]/runs` | 是 | view_workflows | 运行记录列表（含 events） |

### PUT 请求体格式（保存图谱）

```json
{
  "name": "My Workflow",
  "description": "Updated description",
  "nodes": [
    {
      "id": "node_abc123",
      "type": "trigger",
      "label": "Manual Trigger",
      "config": {},
      "positionX": 250,
      "positionY": 50
    },
    {
      "id": "node_def456",
      "type": "condition",
      "label": "Is Company Email?",
      "config": { "field": "lead.email", "operator": "contains", "value": "@company.com" },
      "positionX": 350,
      "positionY": 200
    }
  ],
  "edges": [
    { "sourceNodeId": "node_abc123", "targetNodeId": "node_def456", "sourceHandle": null },
    { "sourceNodeId": "node_def456", "targetNodeId": "node_ghi789", "sourceHandle": "true" }
  ]
}
```

### 响应体格式（运行记录 GET）

```json
[
  {
    "id": "run_uuid",
    "status": "completed",
    "createdAt": "2026-05-11T10:00:00.000Z",
    "startedAt": "2026-05-11T10:00:01.000Z",
    "finishedAt": "2026-05-11T10:00:02.500Z",
    "events": [
      { "nodeId": "node_abc123", "status": "success", "output": { "triggeredAt": "..." }, "createdAt": "..." },
      { "nodeId": "node_def456", "status": "success", "output": { "result": "true" }, "createdAt": "..." }
    ]
  }
]
```

---

## ⚙️ 八、Worker 执行模型

### 8.1 轮询策略

```typescript
// 每 5 秒执行一次
setInterval(async () => {
  // 同时获取 queued（新任务）和 running（续跑任务）
  const [queued, running] = await Promise.all([
    prisma.workflowRun.findMany({ where: { status: "queued" }, include: ... }),
    prisma.workflowRun.findMany({ where: { status: "running" }, include: { events: true, ... } }),
  ]);

  for (const run of [...queued, ...running]) {
    await processRun(run);  // 每个 run 独立 try/catch
  }
}, 5000);
```

### 8.2 性能特征

| 指标 | 数值 |
|------|------|
| 轮询间隔 | 5 秒 |
| 并发处理 | 单线程串行（单 worker） |
| 每轮最大查询 | 2 次 DB 查询（queued + running） |
| 延迟节点 | 最差情况延迟 5 秒（下个轮询周期） |
| 重试退避 | attempt × 1 秒（简单线性） |
| 失败隔离 | 外层 try/catch 保护轮询不崩溃 |

### 8.3 生产化改进建议

- [ ] 接入 BullMQ（已在 deps 中），用队列替代轮询
- [ ] 多 worker 水平扩展（需分布式锁防止重复处理）
- [ ] 延迟节点使用 `BullMQ delay` 替代跨轮询等待
- [ ] 添加重试指数退避（2^attempt × 1s）
- [ ] 错误告警（Slack/邮件通知 dead_letter）

---

## 🛡️ 九、权限矩阵（Phase 3 相关）

| 权限 | Owner | Admin | Operator | Viewer |
|------|:-----:|:-----:|:--------:|:------:|
| `view_workflows` | ✅ | ✅ | ✅ | ✅ |
| `manage_workflows` | ✅ | ✅ | ✅ | ❌ |
| `run_workflows` | ✅ | ✅ | ✅ | ❌ |

所有 Workflow API 路由在操作前强制校验权限，失败返回 **403 Forbidden**。

---

## 📦 十、交付要点（面向 Upwork/Fiverr 客户）

### 🌟 核心价值展示

1. **Visual Workflow Builder** — React Flow 驱动的拖拽式流程设计器，4 种节点类型（触发、动作、条件、延迟），实时配置面板
2. **DAG Execution Engine** — 拓扑排序确保节点按正确顺序执行，条件分支只走匹配路径，延迟节点跨轮询周期等待
3. **Resilience 机制** — 可配置重试次数 + 指数退避 + Dead Letter 状态，失败节点自动重试，耗尽后标记死信
4. **Run Visualization** — 选中任意历史运行，画布节点自动着色显示执行结果（绿=成功、红=失败、蓝脉冲=运行中）
5. **Versioned Workflow** — 每次保存创建新版本，历史可回溯，运行始终使用最新版本
6. **Multi-tenant + RBAC** — 工作流按组织隔离，3 级工作流权限（查看/管理/执行）
7. **Real-time Updates** — 前端 3 秒轮询运行状态，Worker 5 秒轮询执行
8. **Complete API** — 7 个 RESTful 端点覆盖工作流 CRUD + 触发 + 运行查询

### 📊 代码质量指标

| 指标 | 数值 |
|------|------|
| Phase 3 源码行数 | ~1,900 行 |
| 新增源文件 | 14 个 |
| 修改文件 | 8 个 |
| API 端点 | 7 个（Phase 3 部分） |
| 自定义节点类型 | 4 种 |
| Worker 执行模式 | DAG 拓扑排序 + 条件分支 + 延迟 + 重试 |
| 数据库变更 | 2 列新增 |

### 🚀 后续开发路径

- **Webhook Trigger** — 接收外部 HTTP 请求启动工作流
- **Schedule Trigger** — 内置 cron 调度器
- **BullMQ Integration** — 用消息队列替代轮询，支持延迟精确到秒级
- **AI Node** — 接入 LLM 的智能节点（Phase 4）
- **Multi-worker** — 水平扩展工作节点
- **Execution History Timeline** — 甘特图风格的时间线视图
