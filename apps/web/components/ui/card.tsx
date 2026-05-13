import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return <div className={cn("rounded-lg border border-zinc-200/60 bg-white shadow-card", className)}>{children}</div>;
}

export function CardHeader({ children, className }: CardProps) {
  return <div className={cn("px-5 py-4 border-b border-zinc-100", className)}>{children}</div>;
}

export function CardContent({ children, className }: CardProps) {
  return <div className={cn("p-5", className)}>{children}</div>;
}
