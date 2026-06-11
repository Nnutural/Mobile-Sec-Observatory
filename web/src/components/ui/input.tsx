import * as React from "react";
import { colors } from "@/design/colors";
import { cn } from "@/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, style, ...props }, ref) => (
  <input
    ref={ref}
    className={cn("h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2", className)}
    style={{ borderColor: colors.gray[300], color: colors.gray[900], backgroundColor: colors.gradient.diverging[2], ...style }}
    {...props}
  />
));
Input.displayName = "Input";
