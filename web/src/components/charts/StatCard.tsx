import { Card } from "@/components/ui/card";
import { colors } from "@/design/colors";

export interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  accent?: "primary" | "severity" | "neutral";
}

const accentColor = {
  primary: colors.primary[700],
  severity: colors.severity.high,
  neutral: colors.gray[800],
} as const;

export function StatCard({ label, value, subtext, accent = "primary" }: StatCardProps) {
  return (
    <Card className="p-6">
      <div className="text-4xl font-bold tracking-normal" style={{ color: accentColor[accent] }}>
        {value}
      </div>
      <div className="mt-3 text-sm font-medium" style={{ color: colors.gray[800] }}>
        {label}
      </div>
      {subtext ? (
        <div className="mt-1 text-xs" style={{ color: colors.gray[500] }}>
          {subtext}
        </div>
      ) : null}
    </Card>
  );
}
