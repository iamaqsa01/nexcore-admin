import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Base shimmer block used to compose loading states. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden="true"
      {...props}
    />
  );
}
