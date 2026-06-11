import type { CSSProperties } from "react";
import { colors } from "@/design/colors";
import { spacing } from "@/design/spacing";

export interface SidebarItem {
  id: string;
  label: string;
}

interface SidebarProps {
  items: SidebarItem[];
}

export function Sidebar({ items }: SidebarProps) {
  return (
    <aside
      className="shrink-0 rounded-lg border p-4"
      style={{ width: spacing.sidebarWidth, borderColor: colors.gray[200], backgroundColor: colors.gradient.diverging[2] }}
    >
      <div className="mb-3 text-sm font-semibold" style={{ color: colors.gray[800] }}>
        页面导航
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <button
            key={item.id}
            className="w-full rounded-md px-3 py-2 text-left text-sm transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
            style={{
              color: index === 0 ? colors.primary[500] : colors.gray[600],
              backgroundColor: index === 0 ? colors.primary[50] : "transparent",
              "--tw-ring-color": colors.primary[500],
            } as CSSProperties}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </aside>
  );
}
