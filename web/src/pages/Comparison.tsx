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

export function Comparison() {
  const { data } = useComparison();

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
          <TabsTrigger value="flow">流程图</TabsTrigger>
          <TabsTrigger value="pros">优劣势</TabsTrigger>
          <TabsTrigger value="recommendations">建议</TabsTrigger>
        </TabsList>

        <TabsContent value="dimensions">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dimension 中文</TableHead>
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
          <Card>
            <CardContent
              className="flex h-[420px] items-center justify-center text-center text-sm"
              style={{ color: colors.gray[500] }}
            >
              双栏镜像流程图将在阶段 4 实现
            </CardContent>
          </Card>
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
