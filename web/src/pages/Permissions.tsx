import { ComboMatrix } from "@/components/charts/ComboMatrix";
import { PermissionHeatmap } from "@/components/charts/PermissionHeatmap";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { colors } from "@/design/colors";
import { useAppVersions, useApps, useCLRI, usePermissionsMetadata } from "@/hooks/useData";

export function Permissions() {
  const { data: apps } = useApps();
  const { data: versions } = useAppVersions();
  const { data: metadata } = usePermissionsMetadata();
  const { data: clri } = useCLRI();

  if (!apps || !versions || !metadata || !clri) {
    return <Skeleton className="h-[680px] w-full" />;
  }

  const latestRows = apps.apps.map((app) => {
    const latest = versions.versions.find((version) => version.app_id === app.id && version.version_name === app.latest_version);
    const appClri = clri.app_scores.find((item) => item.app_id === app.id);
    return { app, latest, clri: appClri?.clri ?? 0 };
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="grid grid-cols-[180px_220px_1fr_96px] gap-4 pt-6">
          <Select defaultValue="all">
            <option value="all">Category</option>
            {apps.apps.map((app) => <option key={app.category_id} value={app.category_id}>{app.category_zh}</option>)}
          </Select>
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: colors.gray[600] }}>Min Dangerous</span>
            <Slider min={0} max={5} defaultValue={0} />
          </div>
          <Input placeholder="Search..." />
          <Button variant="outline">Reset</Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="combo">Combo Matrix</TabsTrigger>
          <TabsTrigger value="table">Detail Table</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <StackedBarChart data={versions.versions.map((version) => ({ app_id: version.app_id, ...version.permission_counts }))} height={480} />
        </TabsContent>
        <TabsContent value="heatmap">
          <PermissionHeatmap data={metadata.groups} height={480} />
        </TabsContent>
        <TabsContent value="combo">
          <ComboMatrix data={latestRows} height={480} />
        </TabsContent>
        <TabsContent value="table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App</TableHead>
                <TableHead>Cat</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Dangerous</TableHead>
                <TableHead>Exported</TableHead>
                <TableHead>CLRI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latestRows.map(({ app, latest, clri }) => (
                <TableRow key={app.id}>
                  <TableCell>{app.name}</TableCell>
                  <TableCell>{app.category_zh}</TableCell>
                  <TableCell>{latest?.permission_counts.total ?? 0}</TableCell>
                  <TableCell>{latest?.permission_counts.dangerous ?? 0}</TableCell>
                  <TableCell>
                    {(latest?.components.activities.exported ?? 0) +
                      (latest?.components.services.exported ?? 0) +
                      (latest?.components.receivers.exported ?? 0) +
                      (latest?.components.providers.exported ?? 0)}
                  </TableCell>
                  <TableCell>{clri}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
