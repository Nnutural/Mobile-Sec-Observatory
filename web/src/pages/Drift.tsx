import { PDIDecompositionBar } from "@/components/charts/PDIDecompositionBar";
import { RadarChart } from "@/components/charts/RadarChart";
import { SankeyDrift } from "@/components/charts/SankeyDrift";
import { VersionTimeline } from "@/components/charts/VersionTimeline";
import { WeightSlider } from "@/components/charts/WeightSlider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { colors } from "@/design/colors";
import { useAppVersions, usePDI, usePermissionsMetadata } from "@/hooks/useData";

export function Drift() {
  const { data: pdi } = usePDI();
  const { data: versions } = useAppVersions();
  const { data: metadata } = usePermissionsMetadata();

  if (!pdi || !versions || !metadata) {
    return <Skeleton className="h-[760px] w-full" />;
  }

  const selected = pdi.results[0];
  const appVersions = versions.versions.filter((version) => version.app_id === selected.app_id);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <span className="text-sm font-medium" style={{ color: colors.gray[700] }}>App Selector</span>
          <Select defaultValue={selected.app_id}>
            {pdi.results.map((result) => <option key={result.app_id} value={result.app_id}>{result.app_name}</option>)}
          </Select>
          <Badge>Compare Mode</Badge>
        </CardContent>
      </Card>

      <section className="grid grid-cols-[0.9fr_1.4fr] gap-6">
        <VersionTimeline versions={selected.drift_sequence} height={360} />
        <div className="space-y-4">
          <RadarChart data={selected.drift_sequence[0]?.components} height={220} />
          <PDIDecompositionBar data={selected.drift_sequence} height={160} />
        </div>
      </section>

      <SankeyDrift appVersions={appVersions} permissionsMetadata={metadata} height={360} />

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 text-sm font-semibold" style={{ color: colors.gray[800] }}>Detail: Permission Changes Table</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transition</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selected.drift_sequence.flatMap((transition) =>
                transition.details.new_dangerous_permissions.map((permission) => (
                  <TableRow key={`${transition.from_version}-${transition.to_version}-${permission}`}>
                    <TableCell>{transition.from_version} → {transition.to_version}</TableCell>
                    <TableCell>{permission}</TableCell>
                    <TableCell>{metadata.permissions[permission]?.group ?? "UNKNOWN"}</TableCell>
                    <TableCell>{metadata.permissions[permission]?.weight ?? 0}</TableCell>
                    <TableCell>{transition.details.silent_expansion_groups.length > 0 ? "Silent" : "new"}</TableCell>
                  </TableRow>
                )),
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <section className="grid grid-cols-4 gap-4">
        <WeightSlider label="alpha" value={pdi.weights.alpha} min={0} max={1} />
        <WeightSlider label="beta" value={pdi.weights.beta} min={0} max={1} />
        <WeightSlider label="gamma" value={pdi.weights.gamma} min={0} max={1} />
        <WeightSlider label="delta" value={pdi.weights.delta} min={0} max={1} />
      </section>
    </div>
  );
}
