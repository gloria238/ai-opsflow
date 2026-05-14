import { Skeleton } from "@/components/ui/skeleton";

export default function BuilderLoading() {
  return (
    <div className="h-[calc(100vh-8rem)] -m-6 flex flex-col animate-in fade-in duration-300">
      <Skeleton className="h-12 rounded-none shrink-0" />
      <div className="flex flex-1">
        <Skeleton className="w-56 shrink-0 rounded-none" />
        <Skeleton className="flex-1 rounded-none" />
        <Skeleton className="w-72 shrink-0 rounded-none" />
      </div>
    </div>
  );
}
