import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-8 text-center", className)}>
      <div className="size-12 rounded-full bg-zinc-100 flex items-center justify-center mb-4 text-zinc-400">
        {icon || <Inbox className="size-6" />}
      </div>
      <h3 className="text-sm font-medium text-zinc-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-zinc-500 max-w-sm mb-6">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
