"use client";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { WorkflowNodeData } from "../types";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

type DelayWorkflowNode = Node<WorkflowNodeData, "delay">;

const statusStyles: Record<string, string> = {
  success: "!border-purple-400 !shadow-[0_0_0_2px_rgba(168,85,247,0.15)]",
  failed: "!border-red-400 !shadow-[0_0_0_2px_rgba(239,68,68,0.15)] animate-flash-red",
  running: "!border-purple-400 !shadow-[0_0_0_2px_rgba(168,85,247,0.2)]",
  delayed: "!border-amber-400 !border-dashed",
  pending: "opacity-40",
};

export function DelayNode({ data }: NodeProps<DelayWorkflowNode>) {
  const duration = data.config.duration as string | undefined;
  const unit = data.config.unit as string | undefined;
  const status = data._runStatus;

  return (
    <div className={cn(
      "rounded-xl border-2 border-purple-400/70 bg-white shadow-card min-w-[180px] transition-all duration-300",
      status ? statusStyles[status] : "hover:shadow-card-hover",
      status === "delayed" && "animate-pulse-soft"
    )}>
      <div className="bg-purple-500 text-white text-xs font-semibold px-3.5 py-2 rounded-t-xl flex items-center gap-2">
        <Clock className="size-3.5" />
        <span className="truncate">{data.label}</span>
        <span className="ml-auto text-[10px] bg-white/20 rounded px-1.5 py-0.5">delay</span>
      </div>
      <div className="px-3.5 py-2.5 text-[11px] text-zinc-500 leading-relaxed">
        {duration && unit ? `Wait ${duration} ${unit}` : "Set duration"}
      </div>
      <Handle type="target" position={Position.Top} className={cn("w-3 h-3 !bg-purple-400 border-2 border-white", status === "running" && "animate-pulse-soft")} />
      <Handle type="source" position={Position.Bottom} className={cn("w-3 h-3 !bg-purple-400 border-2 border-white", status === "running" && "animate-pulse-soft")} />
    </div>
  );
}
