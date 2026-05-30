import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-violet-600 text-white",
        secondary: "bg-gray-800 text-gray-300",
        destructive: "bg-red-900/30 text-red-300 border border-red-700/40",
        outline: "border border-gray-700 text-gray-300 bg-transparent",
        success: "bg-green-900/30 text-green-300 border border-green-700/40",
        warning: "bg-amber-900/30 text-amber-300 border border-amber-700/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
