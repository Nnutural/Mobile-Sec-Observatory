import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { ChartCard } from "@/components/charts/ChartCard";
import {
  ANDROID_ATLAS,
  OPENHARMONY_ATLAS,
  type AtlasNode,
  type AtlasVariant,
} from "@/components/charts/helpers/atlasData";
import { InteractiveAtlas } from "@/components/charts/InteractiveAtlas";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/design/colors";
import { useComparison } from "@/hooks/useData";

const VARIANT_BUTTONS: Array<{ id: AtlasVariant; label: string }> = [
  { id: "android", label: "Android" },
  { id: "openharmony", label: "OpenHarmony" },
  { id: "compare", label: "双栏对照" },
];

const SUBTITLE: Record<AtlasVariant, string> = {
  android: "Android 安全模型",
  openharmony: "OpenHarmony 安全模型",
  compare: "Android × OpenHarmony 对照",
};

function findFirstChild(node: AtlasNode): AtlasNode {
  if (node.children && node.children.length > 0) return node.children[0];
  return node;
}

export function Atlas() {
  const { data } = useComparison();
  const [variant, setVariant] = useState<AtlasVariant>("android");
  const [selectedNode, setSelectedNode] = useState<AtlasNode>(findFirstChild(ANDROID_ATLAS));

  const isOpenHarmony = useMemo(() => {
    if (!selectedNode) return false;
    const queue: AtlasNode[] = [OPENHARMONY_ATLAS];
    while (queue.length) {
      const current = queue.shift()!;
      if (current.id === selectedNode.id) return true;
      if (current.children) queue.push(...current.children);
    }
    return false;
  }, [selectedNode]);

  if (!data) return <Skeleton className="h-[640px] w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {VARIANT_BUTTONS.map((button) => (
          <button
            key={button.id}
            className="rounded-md border px-4 py-2 text-sm transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
            style={{
              color: variant === button.id ? colors.primary[700] : colors.gray[700],
              backgroundColor: variant === button.id ? colors.primary[50] : colors.gradient.diverging[2],
              borderColor: variant === button.id ? colors.primary[500] : colors.gray[300],
              "--tw-ring-color": colors.primary[500],
            } as React.CSSProperties}
            onClick={() => {
              setVariant(button.id);
              if (button.id === "openharmony") {
                setSelectedNode(findFirstChild(OPENHARMONY_ATLAS));
              } else if (button.id === "android") {
                setSelectedNode(findFirstChild(ANDROID_ATLAS));
              }
            }}
            type="button"
            aria-pressed={variant === button.id}
          >
            {button.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-6">
        <ChartCard
          title="安全机制图谱"
          subtitle={SUBTITLE[variant]}
          exportName={`atlas_${variant}`}
        >
          <InteractiveAtlas
            variant={variant}
            height={560}
            selectedId={selectedNode?.id ?? null}
            onSelect={(node) => node && setSelectedNode(node)}
          />
        </ChartCard>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>节点详情</CardTitle>
              {isOpenHarmony && <Badge>国产</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="text-base font-semibold" style={{ color: colors.gray[900] }}>
              {selectedNode?.label_zh ?? "请选择节点"}
            </div>
            <p style={{ color: colors.gray[600], lineHeight: 1.7 }}>
              {selectedNode?.description_zh ?? "点击左侧机制节点查看详情"}
            </p>
            {selectedNode?.source_url && (
              <a
                className="inline-flex items-center gap-1 rounded text-sm transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
                href={selectedNode.source_url}
                rel="noreferrer"
                style={{ color: colors.primary[500], "--tw-ring-color": colors.primary[500] } as React.CSSProperties}
                target="_blank"
              >
                查看来源 <ExternalLink size={12} aria-hidden />
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
