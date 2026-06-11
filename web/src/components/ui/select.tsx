import * as React from "react";
import { colors } from "@/design/colors";
import { cn } from "@/utils/cn";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, style, ...props }, ref) => (
  <select
    ref={ref}
    className={cn("h-10 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2", className)}
    style={{ borderColor: colors.gray[300], color: colors.gray[900], backgroundColor: colors.gradient.diverging[2], ...style }}
    {...props}
  />
));
Select.displayName = "Select";
