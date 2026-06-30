import type { ReactNode } from "react";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FirecrawlMark() {
  return (
    <div aria-label="Firecrawl" role="img" className="flex h-[22px] w-[22px] items-center justify-center text-[var(--accent)]">
      <Flame className="h-[22px] w-[22px]" fill="currentColor" strokeWidth={1.5} />
    </div>
  );
}

export function RailButton({ active, icon, label }: { active?: boolean; icon: ReactNode; label: string }) {
  return (
    <button
      title={label}
      aria-label={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-[5px] text-[var(--muted)] transition hover:bg-[#121212] hover:text-[var(--foreground)]",
        active && "bg-[var(--accent-soft)] text-[var(--accent)]"
      )}
    >
      {icon}
    </button>
  );
}

export function TopUtility({
  icon,
  label,
  compact,
  hideBelowSm
}: {
  icon: ReactNode;
  label: string;
  compact?: boolean;
  hideBelowSm?: boolean;
}) {
  return (
    <Button
      variant="secondary"
      size={compact ? "icon" : "sm"}
      className={cn("rounded-[5px]", compact ? "h-8 w-8" : "h-8 px-3", hideBelowSm && "hidden sm:inline-flex")}
    >
      {icon}
      {compact ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </Button>
  );
}
