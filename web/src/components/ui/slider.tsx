import * as React from "react";
import { colors } from "@/design/colors";
import { cn } from "@/utils/cn";

export type SliderProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(({ className, style, ...props }, ref) => (
  <input
    ref={ref}
    type="range"
    className={cn("h-2 w-full cursor-pointer appearance-none rounded-lg", className)}
    style={{ accentColor: colors.primary[500], backgroundColor: colors.gray[200], ...style }}
    {...props}
  />
));
Slider.displayName = "Slider";
