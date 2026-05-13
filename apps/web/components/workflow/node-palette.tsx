"use client";
import type { DragEvent } from "react";
import type { NodeType } from "./types";
import { cn } from "@/lib/utils";
import { Play, Cog, GitFork, Clock } from "lucide-react";

const paletteItems: { type: NodeType; label: string; description: string; icon: React.ElementType; color: string; bg: string }[] = [
  { type: "trigger", label: "Trigger", description: "Start workflow execution", icon: Play, color: "text-emerald-600 border-emerald-300", bg: "bg-emerald-50" },
  { type: "action", label: "Action", description: "Perform an operation", icon: Cog, color: "text-blue-600 border-blue-300", bg: "bg-blue-50" },
  { type: "condition", label: "Condition", description: "Branch on a condition", icon: GitFork, color: "text-amber-600 border-amber-300", bg: "bg-amber-50" },
  { type: "delay", label: "Delay", description: "Wait before proceeding", icon: Clock, color: "text-purple-600 border-purple-300", bg: "bg-purple-50" },
];

export function NodePalette() {
  const onDragStart = (e: DragEvent, type: NodeType) => {
    e.dataTransfer.setData("application/node-type", type);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-56 border-r border-zinc-200/60 bg-zinc-50/50 p-3 flex flex-col gap-2 overflow-y-auto">
      <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 px-1">Nodes</p>
      {paletteItems.map(({ type, label, description, icon: Icon, color, bg }) => (
        <div
          key={type}
          draggable
          onDragStart={(e) => onDragStart(e, type)}
          className={cn(
            "flex items-center gap-3 rounded-lg border bg-white px-3 py-2.5 cursor-grab active:cursor-grabbing transition-all hover:shadow-card-hover",
            color,
          )}
        >
          <div className={cn("size-8 rounded-md flex items-center justify-center shrink-0", bg)}>
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-zinc-800">{label}</div>
            <div className="text-[11px] text-zinc-400 truncate">{description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
