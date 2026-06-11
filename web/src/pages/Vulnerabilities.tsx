import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { PermissionHeatmap } from "@/components/charts/PermissionHeatmap";
import { PieChart } from "@/components/charts/PieChart";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { colors } from "@/design/colors";
import { useDashboardStats, useVulnerabilities } from "@/hooks/useData";
import { getSeverityColor } from "@/utils/colors";

export function Vulnerabilities() {
  const { data } = useVulnerabilities();
  const { data: stats } = useDashboardStats();

  if (!data || !stats) {
    return <Skeleton className="h-[760px] w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <span className="text-sm" style={{ color: colors.gray[600] }}>Time: {data.time_range.start} - {data.time_range.end}</span>
          {["Critical", "High", "Moderate", "Low"].map((severity) => <Badge key={severity}>{severity}</Badge>)}
          <Select defaultValue="all">
            <option value="all">Component: All</option>
            <option value="Framework">Framework</option>
            <option value="System">System</option>
            <option value="Media">Media</option>
            <option value="Kernel">Kernel</option>
            <option value="Vendor">Vendor</option>
          </Select>
        </CardContent>
      </Card>

      <LineTrendChart data={stats.vuln_monthly_trend} height={360} />

      <section className="grid grid-cols-2 gap-6">
        <StackedBarChart data={data.vulnerabilities} height={300} />
        <PieChart data={data.vulnerabilities} height={300} />
      </section>

      <PermissionHeatmap data={data.vulnerabilities} height={320} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>CVE ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Component</TableHead>
            <TableHead>Versions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.vulnerabilities.map((vulnerability) => (
            <TableRow key={vulnerability.cve_id}>
              <TableCell>{vulnerability.cve_id}</TableCell>
              <TableCell>{vulnerability.bulletin_date}</TableCell>
              <TableCell style={{ color: getSeverityColor(vulnerability.severity) }}>{vulnerability.severity}</TableCell>
              <TableCell>{vulnerability.type}</TableCell>
              <TableCell>{vulnerability.component_category}</TableCell>
              <TableCell>{vulnerability.affected_versions.join(", ")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
