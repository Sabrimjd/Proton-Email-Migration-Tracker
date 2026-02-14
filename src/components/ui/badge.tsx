import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider font-mono rounded transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-white/10 text-white/70 border border-white/10",
        secondary:
          "bg-white/5 text-white/50 border border-white/5",
        outline: "bg-transparent border border-white/20 text-white/60",
        success:
          "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
        warning:
          "bg-amber-500/20 text-amber-400 border border-amber-500/30",
        info:
          "bg-blue-500/20 text-blue-400 border border-blue-500/30",
        danger:
          "bg-red-500/20 text-red-400 border border-red-500/30",
        high:
          "bg-red-500/20 text-red-400 border border-red-500/30",
        medium:
          "bg-amber-500/20 text-amber-400 border border-amber-500/30",
        low:
          "bg-white/5 text-white/50 border border-white/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
