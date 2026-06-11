import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { colors } from "@/design/colors";
import { cn } from "@/utils/cn";

const buttonVariants = cva(
  "inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--mso-button-bg)] text-[var(--mso-button-fg)]",
        outline: "border bg-transparent text-[var(--mso-button-bg)]",
        ghost: "bg-transparent text-[var(--mso-button-bg)] hover:bg-[var(--mso-button-soft)]",
      },
      size: {
        sm: "h-9 px-3",
        default: "h-10 px-4",
        lg: "h-11 px-6",
        icon: "h-10 w-10 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, style, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      style={{
        "--mso-button-bg": colors.primary[500],
        "--mso-button-fg": colors.gradient.diverging[2],
        "--mso-button-soft": colors.primary[50],
        borderColor: colors.gray[300],
        ...style,
      } as React.CSSProperties}
      {...props}
    />
  ),
);

Button.displayName = "Button";
