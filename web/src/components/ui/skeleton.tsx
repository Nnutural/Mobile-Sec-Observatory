import * as React from "react";
import { colors } from "@/design/colors";
import { cn } from "@/utils/cn";

export function Skeleton({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md", className)}
      style={{ backgroundColor: colors.gray[200], ...style }}
      {...props}
    />
  );
}
