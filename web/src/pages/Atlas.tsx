import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/design/colors";
import { useComparison } from "@/hooks/useData";

const mechanisms = [
  "应用沙箱与身份边界",
  "权限声明与运行时授权",
  "Binder / IPC 鉴权链路",
  "AccessToken 与 APL 分级",
  "Android × OpenHarmony 双栏对照",
];

export function Atlas() {
  const { data } = useComparison();

  if (!data) {
    return <Skeleton className="h-[640px] w-full" />;
  }

  return (
    <div className="grid grid-cols-[260px_1fr] gap-6">
      <Card className="p-4">
        <div className="text-sm font-semibold" style={{ color: colors.gray[800] }}>
          机制索引
        </div>
        <div className="mt-4 space-y-2">
          {mechanisms.map((item, index) => (
            <div
              key={item}
              className="rounded px-3 py-2 text-sm"
              style={{
                color: index === 0 ? colors.primary[500] : colors.gray[600],
                backgroundColor: index === 0 ? colors.primary[50] : "transparent",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>机制图谱将在阶段 4 实现（D3 InteractiveAtlas）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-7" style={{ color: colors.gray[700] }}>
          <p>
            本阶段保留图谱入口和信息结构，阶段 4 将把机制节点、调用边与对比证据接入交互式 D3 视图。
          </p>
          <div className="grid grid-cols-2 gap-3">
            {mechanisms.map((item) => (
              <div key={item} className="rounded-md border p-4" style={{ borderColor: colors.gray[200] }}>
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
