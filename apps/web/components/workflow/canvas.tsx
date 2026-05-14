"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Connection,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { TriggerNode } from "./nodes/trigger-node";
import { ActionNode } from "./nodes/action-node";
import { ConditionNode } from "./nodes/condition-node";
import { DelayNode } from "./nodes/delay-node";
import { NodePalette } from "./node-palette";
import { AISuggestionsPanel } from "./ai-suggestions-panel";
import { NodeConfigPanel } from "./node-config-panel";
import { Toolbar } from "./toolbar";
import type {
  NodeType,
  WorkflowNodeData,
  WorkflowFlowNode,
  WorkflowFlowEdge,
  CanvasWorkflow,
  RunNodeStatus,
} from "./types";

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
};

// Generate a short unique ID for new nodes
function nodeId(): string {
  return `node_${Math.random().toString(36).slice(2, 9)}`;
}

function createNode(type: NodeType, x: number, y: number): WorkflowFlowNode {
  return {
    id: nodeId(),
    type,
    position: { x, y },
    data: {
      label: type.charAt(0).toUpperCase() + type.slice(1),
      nodeType: type,
      config: {},
    },
  };
}

function InnerCanvas({
  workflow,
  nodeStatuses,
  orgSlug,
  onSave,
}: {
  workflow: CanvasWorkflow | null;
  nodeStatuses?: Map<string, RunNodeStatus> | null;
  orgSlug?: string;
  onSave: (name: string, nodes: WorkflowFlowNode[], edges: WorkflowFlowEdge[]) => Promise<void>;
}) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const initialNodes = useMemo(() => (workflow ? workflow.nodes : []), [workflow]);
  const initialEdges = useMemo(() => (workflow ? workflow.edges : []), [workflow]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<WorkflowFlowNode | null>(null);
  const [workflowName, setWorkflowName] = useState(workflow?.name || "Untitled Workflow");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Keep in sync when workflow prop changes
  const [prevWorkflowId, setPrevWorkflowId] = useState(workflow?.id);
  if (workflow?.id !== prevWorkflowId) {
    setPrevWorkflowId(workflow?.id);
    setNodes(initialNodes);
    setEdges(initialEdges);
    setWorkflowName(workflow?.name || "Untitled Workflow");
    setSelectedNode(null);
    setIsDirty(false);
  }

  // Apply run visualization statuses
  const [prevStatusKey, setPrevStatusKey] = useState<string | null>(null);
  const statusKey = nodeStatuses ? `s_${workflow?.id}` : null;
  if (statusKey !== prevStatusKey) {
    setPrevStatusKey(statusKey);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          _runStatus: nodeStatuses?.get(n.id) ?? (nodeStatuses ? "pending" : undefined),
        },
      })),
    );
  }

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, id: `edge_${Date.now()}` }, eds));
      setIsDirty(true);
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/node-type") as NodeType | "";
      if (!type) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode = createNode(type, position.x, position.y);
      setNodes((nds) => nds.concat(newNode));
      setIsDirty(true);
    },
    [screenToFlowPosition, setNodes]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: WorkflowFlowNode) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const updateNodeData = useCallback(
    (nodeId: string, data: { label?: string; config?: Record<string, unknown> }) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          return {
            ...n,
            data: {
              ...n.data,
              ...(data.label && { label: data.label }),
              ...(data.config && { config: data.config }),
            },
          };
        })
      );
      // Update the selected node in the config panel
      setSelectedNode((prev) => {
        if (!prev || prev.id !== nodeId) return prev;
        return {
          ...prev,
          data: {
            ...prev.data,
            ...(data.label && { label: data.label }),
            ...(data.config && { config: data.config }),
          },
        };
      });
      setIsDirty(true);
    },
    [setNodes]
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(workflowName, nodes, edges);
      setIsDirty(false);
      toast.success("Workflow saved");
    } catch {
      toast.error("Failed to save workflow");
    } finally {
      setIsSaving(false);
    }
  }, [workflowName, nodes, edges, onSave]);

  return (
    <div className="flex flex-col h-full">
      <Toolbar
        workflowName={workflowName}
        onNameChange={(name) => {
          setWorkflowName(name);
          setIsDirty(true);
        }}
        onSave={handleSave}
        isDirty={isDirty}
        isSaving={isSaving}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 border-r bg-gray-50 flex flex-col overflow-y-auto">
          <NodePalette />
          {orgSlug && (
            <AISuggestionsPanel
              orgSlug={orgSlug}
              nodes={nodes}
              edges={edges}
              selectedNodeType={selectedNode?.data?.nodeType}
              onAddNode={(node) => {
                setNodes((nds) => nds.concat(node));
                setIsDirty(true);
              }}
            />
          )}
        </div>
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={["Backspace", "Delete"]}
            snapToGrid
            snapGrid={[20, 20]}
          >
            <Background color="#e5e7eb" gap={20} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeStrokeColor="#94a3b8"
              nodeColor={(n) => {
                const colors: Record<string, string> = {
                  trigger: "#22c55e",
                  action: "#3b82f6",
                  condition: "#f59e0b",
                  delay: "#a855f7",
                };
                return colors[n.type || ""] || "#94a3b8";
              }}
              style={{ border: "1px solid #e5e7eb", borderRadius: 8 }}
            />
          </ReactFlow>
        </div>
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={updateNodeData}
          onClose={() => setSelectedNode(null)}
        />
      </div>
    </div>
  );
}

export function WorkflowCanvas(props: {
  workflow: CanvasWorkflow | null;
  nodeStatuses?: Map<string, RunNodeStatus> | null;
  orgSlug?: string;
  onSave: (name: string, nodes: WorkflowFlowNode[], edges: WorkflowFlowEdge[]) => Promise<void>;
}) {
  return (
    <ReactFlowProvider>
      <InnerCanvas {...props} />
    </ReactFlowProvider>
  );
}
