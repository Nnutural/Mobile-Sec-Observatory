import { colors } from "@/design/colors";
import type { Vulnerability } from "@/types";

export function getSeverityColor(severity: Vulnerability["severity"]): string {
  const key = severity.toLowerCase() as keyof typeof colors.severity;
  return colors.severity[key];
}
