import * as React from "react";
import { useExportMode } from "@/components/charts/ExportMode";
import { colors } from "@/design/colors";
import { cn } from "@/utils/cn";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({ defaultValue, value, onValueChange, className, ...props }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = value ?? internalValue;
  const setValue = (nextValue: string) => {
    setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  return (
    <TabsContext.Provider value={{ value: currentValue, setValue }}>
      <div className={cn("w-full", className)} {...props} />
    </TabsContext.Provider>
  );
}

export const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("inline-flex h-10 items-center rounded-md border p-1", className)}
      style={{ backgroundColor: colors.gray[50], borderColor: colors.gray[200], ...style }}
      {...props}
    />
  ),
);
TabsList.displayName = "TabsList";

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, style, value, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    const active = context?.value === value;
    return (
      <button
        ref={ref}
        type="button"
        className={cn("rounded px-3 py-1.5 text-sm font-medium transition", className)}
        style={{
          backgroundColor: active ? colors.gradient.diverging[2] : "transparent",
          color: active ? colors.primary[500] : colors.gray[600],
          ...style,
        }}
        onClick={() => context?.setValue(value)}
        {...props}
      />
    );
  },
);
TabsTrigger.displayName = "TabsTrigger";

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    const exportMode = useExportMode();
    if (!exportMode && context?.value !== value) return null;
    return <div ref={ref} className={cn("mt-4", className)} {...props} />;
  },
);
TabsContent.displayName = "TabsContent";
