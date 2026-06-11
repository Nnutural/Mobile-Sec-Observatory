import { ComparisonFlowDiagram } from "@/components/charts/ComparisonFlowDiagram";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { colors } from "@/design/colors";
import { useComparison } from "@/hooks/useData";

export function Comparison() {
  const { data } = useComparison();

  if (!data) {
    return <Skeleton className="h-[680px] w-full" />;
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-normal" style={{ color: colors.gray[900] }}>
          Android vs OpenHarmony: 移动终端权限治理机制对比
        </h1>
        <p className="mt-2 text-sm" style={{ color: colors.gray[500] }}>Data Collected: {data.data_collection_date}</p>
      </section>

      <Tabs defaultValue="dimensions">
        <TabsList>
          <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
          <TabsTrigger value="flow">Flow Diagrams</TabsTrigger>
          <TabsTrigger value="pros">Pros & Cons</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="dimensions">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dimension</TableHead>
                <TableHead>Android</TableHead>
                <TableHead>OpenHarmony</TableHead>
                <TableHead>Adv.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.dimensions.map((dimension) => (
                <TableRow key={dimension.id}>
                  <TableCell>{dimension.name_zh}</TableCell>
                  <TableCell>{dimension.android.mechanism}</TableCell>
                  <TableCell>{dimension.openharmony.mechanism}</TableCell>
                  <TableCell><Badge>{dimension.advantage}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="flow">
          <ComparisonFlowDiagram android={data.flow_diagrams.android} openharmony={data.flow_diagrams.openharmony} height={420} />
        </TabsContent>

        <TabsContent value="pros">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>OpenHarmony 优势</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {data.advantages_disadvantages.openharmony_advantages.map((item) => (
                  <div key={item.id} className="rounded border p-4" style={{ borderColor: colors.gray[200] }}>
                    <div className="font-medium" style={{ color: colors.gray[900] }}>{item.title}</div>
                    <p className="mt-2 text-sm" style={{ color: colors.gray[600] }}>{item.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>OpenHarmony 不足</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {data.advantages_disadvantages.openharmony_disadvantages.map((item) => (
                  <div key={item.id} className="rounded border p-4" style={{ borderColor: colors.gray[200] }}>
                    <div className="font-medium" style={{ color: colors.gray[900] }}>{item.title}</div>
                    <p className="mt-2 text-sm" style={{ color: colors.gray[600] }}>{item.description}</p>
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
                  <div className="font-semibold" style={{ color: colors.gray[900] }}>{recommendation.id} · {recommendation.title}</div>
                  <Badge>{recommendation.priority}</Badge>
                </div>
                <p className="mt-2 text-sm" style={{ color: colors.gray[600] }}>{recommendation.description}</p>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
