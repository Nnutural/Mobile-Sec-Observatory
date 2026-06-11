import { colors } from "@/design/colors";

export interface InteractiveAtlasProps {
  selectedMechanism?: string;
  data?: unknown;
  height?: number;
}

export function InteractiveAtlas(props: InteractiveAtlasProps) {
  return (
    <div className="rounded-lg border border-dashed p-4" style={{ minHeight: props.height ?? 420, borderColor: colors.gray[300], backgroundColor: colors.gray[50], color: colors.gray[600] }}>
      <div className="font-medium">InteractiveAtlas · Chart placeholder · 待接入数据</div>
      <pre className="mt-3 overflow-auto text-xs">{JSON.stringify(props, null, 2)}</pre>
    </div>
  );
}
