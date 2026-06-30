import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-[var(--border)] bg-[#171717] text-[var(--muted-2)]",
        orange: "border-orange-500/35 bg-[var(--accent-soft)] text-orange-200",
        green: "border-green-500/35 bg-green-500/10 text-green-300",
        yellow: "border-yellow-500/35 bg-yellow-500/10 text-yellow-200",
        red: "border-red-500/35 bg-red-500/10 text-red-300"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
