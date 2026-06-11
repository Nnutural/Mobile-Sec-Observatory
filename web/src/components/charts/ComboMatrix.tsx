import { colors } from "@/design/colors";

export interface ComboMatrixProps {
  data?: unknown;
  width?: number;
  height?: number;
}

export function ComboMatrix(props: ComboMatrixProps) {
  return (
    <div className="rounded-lg border border-dashed p-4" style={{ minHeight: props.height ?? 320, borderColor: colors.gray[300], backgroundColor: colors.gray[50], color: colors.gray[600] }}>
      <div className="font-medium">ComboMatrix · Chart placeholder · 待接入数据</div>
      <pre className="mt-3 overflow-auto text-xs">{JSON.stringify(props, null, 2)}</pre>
    </div>
  );
}
