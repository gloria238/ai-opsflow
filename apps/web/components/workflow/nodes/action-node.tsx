"use client";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { WorkflowNodeData } from "../types";
import { cn } from "@/lib/utils";
import { Cog } from "lucide-react";

type ActionWorkflowNode = Node<WorkflowNodeData, "action">;

const actionLabels: Record<string, string> = {
  send_email: "Send email",
  score_lead: "Score lead (AI)",
  update_lead: "Update lead",
  create_lead: "Create lead",
  compose_email: "Compose email (AI)",
  slack_notify: "Slack notification",
  http_request: "HTTP request",
};

const statusStyles: Record<string, string> = {
  success: "!border-blue-400 !shadow-[0_0_0_2px_rgba(59,130,246,0.15)]",
  failed: "!border-red-400 !shadow-[0_0_0_2px_rgba(239,68,68,0.15)] animate-flash-red",
  running: "!border-blue-400 !shadow-[0_0_0_2px_rgba(59,130,246,0.2)]",
  delayed: "!border-amber-400 !border-dashed",
  pending: "opacity-40",
};

export function ActionNode({ data }: NodeProps<ActionWorkflowNode>) {
  const actionType = data.config.action as string | undefined;
  const display = actionType ? actionLabels[actionType] || actionType : "Configure action";
  const status = data._runStatus;

  return (
    <div className={cn(
      "rounded-xl border-2 border-blue-400/70 bg-white shadow-card min-w-[180px] transition-all duration-300",
      status ? statusStyles[status] : "hover:shadow-card-hover"
    )}>
      <div className="bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-t-xl flex items-center gap-2">
        <Cog className="size-3.5" />
        <span className="truncate">{data.label}</span>
        <span className="ml-auto text-[10px] bg-white/20 rounded px-1.5 py-0.5">action</span>
      </div>
      <div className="px-3.5 py-2.5 text-[11px] text-zinc-500 leading-relaxed">{display}</div>
      <Handle type="target" position={Position.Top} className={cn("w-3 h-3 !bg-blue-400 border-2 border-white", status === "running" && "animate-pulse-soft")} />
      <Handle type="source" position={Position.Bottom} className={cn("w-3 h-3 !bg-blue-400 border-2 border-white", status === "running" && "animate-pulse-soft")} />
    </div>
  );
}
