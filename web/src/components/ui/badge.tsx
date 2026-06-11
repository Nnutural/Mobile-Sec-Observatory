import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { colors } from "@/design/colors";
import { cn } from "@/utils/cn";

const badgeVariants = cva("inline-flex items-center rounded px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-[var(--mso-badge-bg)] text-[var(--mso-badge-fg)]",
      outline: "border bg-transparent text-[var(--mso-badge-bg)]",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, style, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      style={{
        "--mso-badge-bg": colors.primary[50],
        "--mso-badge-fg": colors.primary[700],
        borderColor: colors.primary[300],
        ...style,
      } as React.CSSProperties}
      {...props}
    />
  );
}
