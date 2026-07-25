import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-xl border text-card-foreground transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-card border-border shadow-[0_1px_3px_0_rgb(0_0_0/0.06),0_1px_2px_-1px_rgb(0_0_0/0.04)] hover:shadow-[0_4px_12px_0_rgb(0_0_0/0.08),0_2px_4px_-1px_rgb(0_0_0/0.04)]",
        modern: "bg-glass-card border-glass-card backdrop-blur-md shadow-card-glow hover:shadow-card-glow-hover",
        aiGlow: "bg-glass-card border-glass-card backdrop-blur-md shadow-card-glow hover:shadow-card-glow-hover hover:border-ai-cyan/50 hover:scale-[1.02]",
        gradient: "bg-gradient-to-br from-card to-card/50 border-glass-card shadow-glow",
        aiCyan: "bg-glass-card border-2 border-ai-cyan/30 backdrop-blur-md shadow-card-glow hover:border-ai-cyan/50 hover:shadow-card-glow-hover",
        aiPrimary: "bg-glass-card border-2 border-primary/30 backdrop-blur-md shadow-card-glow hover:border-primary/50 hover:shadow-card-glow-hover",
        aiBlue: "bg-glass-card border-2 border-ai-blue/30 backdrop-blur-md shadow-card-glow hover:border-ai-blue/50 hover:shadow-card-glow-hover",
        dashboardCard: "bg-glass-card border-2 border-glass-card backdrop-blur-md shadow-card-glow hover:border-primary/30 hover:shadow-card-glow-hover"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1 p-5", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-base font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-5 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants }
