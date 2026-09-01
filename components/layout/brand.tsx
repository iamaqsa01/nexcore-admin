import Link from "next/link";
import { Waves } from "lucide-react";

export function Brand() {
  return (
    <Link
      href="/admin"
      className="flex items-center gap-2 rounded-md px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
        <Waves className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="text-sm font-bold tracking-tight">NEXCORE</span>
    </Link>
  );
}
