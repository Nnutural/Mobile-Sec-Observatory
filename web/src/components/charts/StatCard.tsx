import { colors } from "@/design/colors";
import { Card } from "@/components/ui/card";

export interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
}

export function StatCard({ label, value, subtext }: StatCardProps) {
  return (
    <Card className="p-6">
      <div className="text-4xl font-bold tracking-normal" style={{ color: colors.primary[700] }}>
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
