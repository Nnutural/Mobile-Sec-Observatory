import { Github, ShieldCheck } from "lucide-react";
import { NavLink } from "react-router-dom";
import { colors } from "@/design/colors";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/atlas", label: "Atlas" },
  { to: "/permissions", label: "Permissions" },
  { to: "/drift", label: "Drift" },
  { to: "/vulnerabilities", label: "Vulnerabilities" },
  { to: "/comparison", label: "Comparison" },
  { to: "/methodology", label: "Methodology" },
];

export function Header() {
  return (
    <header
      className="sticky top-0 z-20 border-b"
      style={{ backgroundColor: colors.gradient.diverging[2], borderColor: colors.gray[200] }}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-12">
        <NavLink to="/" className="flex items-center gap-3 font-semibold" style={{ color: colors.primary[700] }}>
          <ShieldCheck size={28} />
          <span>MobileSec Observatory</span>
        </NavLink>
        <nav className="flex flex-1 items-center justify-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm font-medium transition hover:opacity-80"
              style={({ isActive }) => ({
                color: isActive ? colors.primary[500] : colors.gray[600],
                backgroundColor: isActive ? colors.primary[50] : "transparent",
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm" style={{ color: colors.gray[500] }}>
          <span>数据更新日期 2026-06-11</span>
          <a href="https://github.com/" aria-label="GitHub" style={{ color: colors.gray[700] }}>
            <Github size={20} />
          </a>
        </div>
      </div>
    </header>
  );
}
