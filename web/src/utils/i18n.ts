import { colors } from "@/design/colors";

export const SEVERITY_LABEL: Record<"Critical" | "High" | "Moderate" | "Low", string> = {
  Critical: "严重",
  High: "高危",
  Moderate: "中危",
  Low: "低危",
};

export const SEVERITY_ORDER = ["Critical", "High", "Moderate", "Low"] as const;

export const COMPONENT_CATEGORY_LABEL: Record<"Framework" | "System" | "Media" | "Kernel" | "Vendor", string> = {
  Framework: "框架层",
  System: "系统",
  Media: "媒体",
  Kernel: "内核",
  Vendor: "厂商",
};

export const CATEGORY_ZH_FALLBACK: Record<string, string> = {
  Development: "开发工具",
  Internet: "通信",
  Multimedia: "媒体",
  Navigation: "位置导航",
  Reading: "阅读",
};

const severityColorKey = {
  Critical: "critical",
  High: "high",
  Moderate: "moderate",
  Low: "low",
} as const;

export function severityColor(severity: keyof typeof SEVERITY_LABEL): string {
  return colors.severity[severityColorKey[severity]];
}

export function categoryColor(category: string): string {
  const palette = Object.values(colors.permission);
  const hash = Array.from(category).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[hash % palette.length] ?? colors.primary[500];
}
