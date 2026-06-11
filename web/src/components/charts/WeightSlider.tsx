import { colors } from "@/design/colors";

export interface WeightSliderProps {
  label?: string;
  value?: number;
  min?: number;
  max?: number;
}

export function WeightSlider(props: WeightSliderProps) {
  return (
    <div className="rounded-lg border border-dashed p-4" style={{ minHeight: 120, borderColor: colors.gray[300], backgroundColor: colors.gray[50], color: colors.gray[600] }}>
      <div className="font-medium">WeightSlider · Chart placeholder · 待接入数据</div>
      <pre className="mt-3 overflow-auto text-xs">{JSON.stringify(props, null, 2)}</pre>
    </div>
  );
}
