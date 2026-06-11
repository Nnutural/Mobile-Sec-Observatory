import { colors } from "@/design/colors";
import type { FlowDiagram } from "@/types";

export interface ComparisonFlowDiagramProps {
  android?: FlowDiagram;
  openharmony?: FlowDiagram;
  height?: number;
}

export function ComparisonFlowDiagram(props: ComparisonFlowDiagramProps) {
  return (
    <div className="rounded-lg border border-dashed p-4" style={{ minHeight: props.height ?? 360, borderColor: colors.gray[300], backgroundColor: colors.gray[50], color: colors.gray[600] }}>
      <div className="font-medium">ComparisonFlowDiagram · Chart placeholder · 待接入数据</div>
      <pre className="mt-3 overflow-auto text-xs">{JSON.stringify(props, null, 2)}</pre>
    </div>
  );
}
