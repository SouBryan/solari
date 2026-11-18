import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const solariBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/15 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        success: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
        warning: "border-amber-500/30 bg-amber-500/15 text-amber-400",
        destructive: "border-red-500/30 bg-red-500/15 text-red-400",
        outline: "border-border text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof solariBadgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(solariBadgeVariants({ variant }), className)} {...props} />;
}
