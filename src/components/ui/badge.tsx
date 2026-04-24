import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        {
          "border border-transparent bg-slate-800 text-slate-400": variant === "default",
          "border border-transparent bg-slate-800 text-slate-300": variant === "secondary",
          "border border-red-500/20 bg-red-500/10 text-red-500": variant === "destructive",
          "border border-slate-700 text-slate-400": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
