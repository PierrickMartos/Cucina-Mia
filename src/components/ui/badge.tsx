import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground",
        secondary:
          "bg-secondary-container text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground",
        outline: "text-foreground ghost-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, onClick, ...props }: BadgeProps) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(badgeVariants({ variant }), className)}
        {...(props as React.HTMLAttributes<HTMLButtonElement>)}
      />
    )
  }
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...(props as React.HTMLAttributes<HTMLDivElement>)} />
  )
}

export { Badge, badgeVariants }
