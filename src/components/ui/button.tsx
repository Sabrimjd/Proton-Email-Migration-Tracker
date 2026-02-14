import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs font-medium font-mono uppercase tracking-wider transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d4aa]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0b0f] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "bg-[#00d4aa] text-[#0a0b0f] hover:bg-[#00d4aa]/90 shadow-[0_0_15px_rgba(0,212,170,0.3)] hover:shadow-[0_0_20px_rgba(0,212,170,0.4)]",
        destructive: "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30",
        outline: "border border-white/20 bg-transparent text-white/70 hover:bg-white/5 hover:border-white/30",
        secondary: "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10",
        ghost: "text-white/60 hover:text-white/90 hover:bg-white/5",
        link: "text-[#00d4aa] underline-offset-4 hover:underline",
        success: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30",
      },
      size: {
        default: "h-8 px-4 rounded",
        sm: "h-7 px-3 rounded text-[10px]",
        lg: "h-10 px-6 rounded",
        icon: "h-8 w-8 rounded",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
