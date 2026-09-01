import { Skeleton } from "@/components/ui/skeleton";

export default function UsageLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-6 w-72" />
      <div className="space-y-px rounded-lg border border-border">
        <Skeleton className="h-11 w-full rounded-t-lg" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-none last:rounded-b-lg" />
        ))}
      </div>
    </div>
  );
}
