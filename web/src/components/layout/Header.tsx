import { Github, ShieldCheck } from "lucide-react";
import { NavLink } from "react-router-dom";
import { colors } from "@/design/colors";
import { useDashboardStats } from "@/hooks/useData";
import { formatDate } from "@/utils/formatters";

const navItems = [
  { to: "/", label: "首页总览" },
  { to: "/atlas", label: "机制图谱" },
  { to: "/permissions", label: "权限分析" },
  { to: "/drift", label: "权限漂移" },
  { to: "/vulnerabilities", label: "漏洞态势" },
  { to: "/comparison", label: "国产对比" },
  { to: "/methodology", label: "方法说明" },
  { to: "/sensitivity", label: "敏感性分析" },
];

export function Header() {
  const { data } = useDashboardStats();
  const dateText = data?.generated_at ? formatDate(data.generated_at) : "数据更新中";

  return (
    <header
      className="sticky top-0 z-20 border-b"
      style={{ backgroundColor: colors.gradient.diverging[2], borderColor: colors.gray[200] }}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-12">
        <NavLink
          to="/"
          className="flex items-center gap-3 font-semibold transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
          style={{ color: colors.primary[700], "--tw-ring-color": colors.primary[500] } as React.CSSProperties}
        >
          <ShieldCheck size={28} />
          <span>MobileSec Observatory</span>
        </NavLink>
        <nav className="flex flex-1 items-center justify-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm font-medium transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
              style={({ isActive }) =>
                ({
                  color: isActive ? colors.primary[500] : colors.gray[600],
                  backgroundColor: isActive ? colors.primary[50] : "transparent",
                  "--tw-ring-color": colors.primary[500],
                }) as React.CSSProperties
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm" style={{ color: colors.gray[500] }}>
          <span>数据更新日期 {dateText}</span>
          <a
            className="rounded transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
            href="https://github.com/"
            aria-label="GitHub"
            style={{ color: colors.gray[700], "--tw-ring-color": colors.primary[500] } as React.CSSProperties}
            target="_blank"
            rel="noreferrer"
          >
            <Github size={20} />
          </a>
        </div>
      </div>
    </header>
  );
}
