"use client";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { WorkflowNodeData } from "../types";
import { cn } from "@/lib/utils";
import { GitFork } from "lucide-react";

type ConditionWorkflowNode = Node<WorkflowNodeData, "condition">;

const statusStyles: Record<string, string> = {
  success: "!border-amber-400 !shadow-[0_0_0_2px_rgba(245,158,11,0.15)]",
  failed: "!border-red-400 !shadow-[0_0_0_2px_rgba(239,68,68,0.15)] animate-flash-red",
  running: "!border-amber-400 !shadow-[0_0_0_2px_rgba(245,158,11,0.2)]",
  delayed: "!border-amber-400 !border-dashed",
  pending: "opacity-40",
};

export function ConditionNode({ data }: NodeProps<ConditionWorkflowNode>) {
  const field = data.config.field as string | undefined;
  const operator = data.config.operator as string | undefined;
  const value = data.config.value as string | undefined;
  const status = data._runStatus;

  return (
    <div className="relative">
      <div className={cn(
        "rotate-45 w-24 h-24 border-2 border-amber-400/70 bg-white shadow-card flex items-center justify-center transition-all duration-300",
        status ? statusStyles[status] : "hover:shadow-card-hover"
      )}>
        <div className="-rotate-45 text-center px-1">
          <GitFork className="size-4 text-amber-500 mx-auto mb-1" />
          <div className="text-[11px] font-semibold text-zinc-700 leading-tight">{data.label}</div>
          {field && operator && value && (
            <div className="text-[9px] text-zinc-400 mt-0.5 leading-tight truncate max-w-[80px]">
              {field} {operator === "equals" ? "=" : operator === "contains" ? "contains" : operator} {value}
            </div>
          )}
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className={cn("w-3 h-3 !bg-amber-400 border-2 border-white", status === "running" && "animate-pulse-soft")}
        style={{ top: -6 }}
      />
      <Handle
        type="source"
        id="true"
        position={Position.Right}
        className="w-3 h-3 !bg-emerald-400 border-2 border-white"
        style={{ right: -6 }}
      />
      <Handle
        type="source"
        id="false"
        position={Position.Left}
        className="w-3 h-3 !bg-red-400 border-2 border-white"
        style={{ left: -6 }}
      />
      <span className="absolute -right-8 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 font-semibold">
        yes
      </span>
      <span className="absolute -left-7 top-1/2 -translate-y-1/2 text-[10px] text-red-600 font-semibold">
        no
      </span>
    </div>
  );
}
