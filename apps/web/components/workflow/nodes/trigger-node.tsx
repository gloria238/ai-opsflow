"use client";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { WorkflowNodeData } from "../types";
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";

type TriggerWorkflowNode = Node<WorkflowNodeData, "trigger">;

const statusStyles: Record<string, string> = {
  success: "!border-emerald-400 !shadow-[0_0_0_2px_rgba(16,185,129,0.15)]",
  failed: "!border-red-400 !shadow-[0_0_0_2px_rgba(239,68,68,0.15)] animate-flash-red",
  running: "!border-blue-400 !shadow-[0_0_0_2px_rgba(59,130,246,0.2)]",
  delayed: "!border-amber-400 !border-dashed",
  pending: "opacity-40",
};

export function TriggerNode({ data }: NodeProps<TriggerWorkflowNode>) {
  const status = data._runStatus;
  return (
    <div className={cn(
      "rounded-xl border-2 border-emerald-400/70 bg-white shadow-card min-w-[180px] transition-all duration-300",
      status ? statusStyles[status] : "hover:shadow-card-hover"
    )}>
      <div className="bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-t-xl flex items-center gap-2">
        <Play className="size-3.5 fill-white" />
        <span className="truncate">{data.label}</span>
        <span className="ml-auto text-[10px] bg-white/20 rounded px-1.5 py-0.5">trigger</span>
      </div>
      <div className="px-3.5 py-2.5 text-[11px] text-zinc-500 leading-relaxed">
        {data.config.type === "webhook" ? "Webhook trigger" :
         data.config.type === "schedule" ? `Scheduled (${data.config.cron || "every hour"})` :
         "Manual trigger"}
      </div>
      <Handle type="source" position={Position.Bottom} className={cn(
        "w-3 h-3 !bg-emerald-400 border-2 border-white",
        status === "running" && "animate-pulse-soft"
      )} />
    </div>
  );
}
