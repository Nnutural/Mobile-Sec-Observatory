import { useMemo, useState } from "react";
import { ChartCard } from "@/components/charts/ChartCard";
import { ComparisonFlowDiagram } from "@/components/charts/ComparisonFlowDiagram";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { colors } from "@/design/colors";
import { useComparison } from "@/hooks/useData";
import { formatDate } from "@/utils/formatters";

const advantageLabel = {
  android: "Android",
  openharmony: "OpenHarmony",
  neutral: "均衡",
} as const;

const priorityLabel = {
  high: "高",
  medium: "中",
  low: "低",
} as const;

interface SelectedStep {
  side: "android" | "openharmony";
  stepId: string;
}

export function Comparison() {
  const { data } = useComparison();
  const [selectedStep, setSelectedStep] = useState<SelectedStep | null>(null);

  const stepDescription = useMemo(() => {
    if (!selectedStep || !data) return null;
    const diagram = data.flow_diagrams[selectedStep.side];
    const node = diagram.nodes.find((n) => n.id === selectedStep.stepId);
    if (!node) return null;
    return {
      label: node.label,
      type: node.type,
      counterpart: data.flow_diagrams[selectedStep.side === "android" ? "openharmony" : "android"].nodes.find(
        (n) => n.id === selectedStep.stepId,
      ),
    };
  }, [data, selectedStep]);

  if (!data) {
    return <Skeleton className="h-[680px] w-full" />;
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-normal" style={{ color: colors.gray[900] }}>
          Android × OpenHarmony 权限治理机制对比
        </h1>
        <p className="mt-2 text-sm" style={{ color: colors.gray[500] }}>
          数据采集日期：{formatDate(data.data_collection_date)}
        </p>
      </section>

      <Tabs defaultValue="dimensions">
        <TabsList>
          <TabsTrigger value="dimensions">维度对比</TabsTrigger>
          <TabsTrigger value="flow">流程对照</TabsTrigger>
          <TabsTrigger value="pros">优劣势</TabsTrigger>
          <TabsTrigger value="recommendations">建议</TabsTrigger>
        </TabsList>

        <TabsContent value="dimensions">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>维度</TableHead>
                <TableHead>Android 机制</TableHead>
                <TableHead>OpenHarmony 机制</TableHead>
                <TableHead>倾向</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.dimensions.map((dimension) => (
                <TableRow key={dimension.id}>
                  <TableCell>{dimension.name_zh}</TableCell>
                  <TableCell>{dimension.android.mechanism}</TableCell>
                  <TableCell>{dimension.openharmony.mechanism}</TableCell>
                  <TableCell>
                    <Badge>{advantageLabel[dimension.advantage]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="flow">
          <div className="grid grid-cols-[1fr_320px] gap-6">
            <ChartCard
              title="Android × OpenHarmony 权限流程双栏对照"
              subtitle="悬停任一节点，对侧同名步骤同步高亮"
              exportName="comparison_flow"
            >
              <ComparisonFlowDiagram
                android={data.flow_diagrams.android}
                openharmony={data.flow_diagrams.openharmony}
                selectedStep={selectedStep}
                onSelectStep={(stepId, side) => setSelectedStep({ stepId, side })}
                height={520}
              />
            </ChartCard>
            <Card>
              <CardHeader>
                <CardTitle>步骤详情</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm" style={{ color: colors.gray[700] }}>
                {stepDescription ? (
                  <>
                    <div className="text-base font-semibold" style={{ color: colors.gray[900] }}>
                      {stepDescription.label}
                    </div>
                    <div style={{ color: colors.gray[500] }}>步骤类别：{stepDescription.type}</div>
                    {stepDescription.counterpart ? (
                      <div>对侧步骤：{stepDescription.counterpart.label}</div>
                    ) : (
                      <div style={{ color: colors.gray[500] }}>该步骤暂无补充说明</div>
                    )}
                  </>
                ) : (
                  <div style={{ color: colors.gray[500] }}>点击左侧任一步骤查看详情</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pros">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>OpenHarmony 优势</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.advantages_disadvantages.openharmony_advantages.map((item) => (
                  <div key={item.id} className="rounded border p-4" style={{ borderColor: colors.gray[200] }}>
                    <div className="font-medium" style={{ color: colors.gray[900] }}>
                      {item.title}
                    </div>
                    <p className="mt-2 text-sm" style={{ color: colors.gray[600] }}>
                      {item.description}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>OpenHarmony 不足</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.advantages_disadvantages.openharmony_disadvantages.map((item) => (
                  <div key={item.id} className="rounded border p-4" style={{ borderColor: colors.gray[200] }}>
                    <div className="font-medium" style={{ color: colors.gray[900] }}>
                      {item.title}
                    </div>
                    <p className="mt-2 text-sm" style={{ color: colors.gray[600] }}>
                      {item.description}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations">
          <div className="space-y-3">
            {data.recommendations.map((recommendation) => (
              <Card key={recommendation.id} className="p-5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold" style={{ color: colors.gray[900] }}>
                    {recommendation.id} · {recommendation.title}
                  </div>
                  <Badge>{priorityLabel[recommendation.priority]}</Badge>
                </div>
                <p className="mt-2 text-sm" style={{ color: colors.gray[600] }}>
                  {recommendation.description}
                </p>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
