"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { WorkflowCanvas } from "@/components/workflow/canvas";
import { AIWorkflowGenerator } from "@/components/workflow/ai-workflow-generator";
import { RunSelector } from "@/components/workflow/run-selector";
import type {
  WorkflowFlowNode,
  WorkflowFlowEdge,
  CanvasWorkflow,
  RunNodeStatus,
} from "@/components/workflow/types";

interface Props {
  workflowId: string;
  orgSlug: string;
  readOnly?: boolean;
  initialWorkflow: {
    id: string;
    name: string;
    description: string | null;
    version: number;
  };
}

export function BuilderClient({ workflowId, orgSlug, readOnly, initialWorkflow }: Props) {
  const [workflow, setWorkflow] = useState<CanvasWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nodeStatuses, setNodeStatuses] = useState<Map<string, RunNodeStatus> | null>(null);
  const [generationKey, setGenerationKey] = useState(0);

  const handleAIGenerate = useCallback(
    (newNodes: WorkflowFlowNode[], newEdges: WorkflowFlowEdge[]) => {
      setWorkflow((prev) => {
        if (!prev) return prev;
        return { ...prev, nodes: newNodes, edges: newEdges };
      });
      setGenerationKey((k) => k + 1);
    },
    [],
  );

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/orgs/${orgSlug}/workflows/${workflowId}`);
        if (!res.ok) throw new Error("Failed to load workflow");
        const data = await res.json();
        const latest = data.versions?.[0];

        setWorkflow({
          id: data.id,
          name: data.name,
          description: data.description,
          nodes: latest?.nodes?.map((n: { id: string; type: string; label?: string | null; config: unknown; positionX: number; positionY: number }) => ({
            id: n.id,
            type: n.type,
            position: { x: n.positionX, y: n.positionY },
            data: {
              label: n.label || n.type.charAt(0).toUpperCase() + n.type.slice(1),
              nodeType: n.type,
              config: (n.config || {}) as Record<string, unknown>,
            },
          })) || [],
          edges: latest?.edges?.map((e: { id?: string; sourceNodeId: string; targetNodeId: string; sourceHandle?: string | null }) => ({
            id: e.id || `edge_${e.sourceNodeId}_${e.targetNodeId}`,
            source: e.sourceNodeId,
            target: e.targetNodeId,
            sourceHandle: e.sourceHandle || undefined,
          })) || [],
          version: latest?.version || 1,
        });
      } catch {
        setError("Failed to load workflow");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [workflowId, orgSlug]);

  const handleSave = useCallback(
    async (name: string, nodes: WorkflowFlowNode[], edges: WorkflowFlowEdge[]) => {
      const body = {
        name,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          label: n.data.label,
          config: n.data.config,
          positionX: n.position.x,
          positionY: n.position.y,
        })),
        edges: edges.map((e) => ({
          sourceNodeId: e.source,
          targetNodeId: e.target,
          sourceHandle: e.sourceHandle || null,
        })),
      };

      const res = await fetch(`/api/orgs/${orgSlug}/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to save");
      }
    },
    [workflowId, orgSlug]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)] text-gray-400">
        Loading workflow...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)] text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] -m-6 flex flex-col">
      <div className="flex items-center justify-between border-b bg-white px-4 py-1.5 shrink-0">
        <span className="text-xs text-gray-400">
          {readOnly ? "Read-only view" : nodeStatuses ? "Showing run visualization" : "Editing mode"}
        </span>
        <RunSelector
          workflowId={workflowId}
          orgSlug={orgSlug}
          onSelect={(map) => setNodeStatuses(map)}
        />
      </div>
      <div className="flex-1 flex flex-col">
        <AIWorkflowGenerator orgSlug={orgSlug} onGenerate={handleAIGenerate} />
        <div className="flex-1">
          <WorkflowCanvas
            key={`canvas_${generationKey}`}
            workflow={workflow}
            nodeStatuses={nodeStatuses}
            orgSlug={orgSlug}
            onSave={handleSave}
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
}
