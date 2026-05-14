import { Skeleton } from "@/components/ui/skeleton";

export default function MembersLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Skeleton className="h-8 w-28" />
      <div className="flex gap-4 border-b pb-3">
        <Skeleton className="h-8 w-16 rounded" />
        <Skeleton className="h-8 w-20 rounded" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    </div>
  );
}
