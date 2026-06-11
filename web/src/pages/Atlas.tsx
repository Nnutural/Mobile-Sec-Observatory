import { InteractiveAtlas } from "@/components/charts/InteractiveAtlas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/design/colors";
import { useComparison } from "@/hooks/useData";

const mechanisms = ["Android Sandbox", "Permission Flow", "Binder IPC", "AccessToken", "Combined Comparison"];

export function Atlas() {
  const { data } = useComparison();

  if (!data) {
    return <Skeleton className="h-[640px] w-full" />;
  }

  return (
    <div className="grid grid-cols-[260px_1fr] gap-6">
      <Card className="p-4">
        <div className="text-sm font-semibold" style={{ color: colors.gray[800] }}>Sidebar</div>
        <div className="mt-4 space-y-2">
          {mechanisms.map((item, index) => (
            <div key={item} className="rounded px-3 py-2 text-sm" style={{ color: index === 1 ? colors.primary[500] : colors.gray[600], backgroundColor: index === 1 ? colors.primary[50] : "transparent" }}>
              {index === 1 ? "⊙" : "○"} {item}
            </div>
          ))}
        </div>
        <div className="mt-8 text-sm" style={{ color: colors.gray[500] }}>Selected: Permission Flow</div>
      </Card>
      <div className="space-y-6">
        <InteractiveAtlas selectedMechanism="Permission Flow" data={data.flow_diagrams.android} height={420} />
        <Card>
          <CardHeader>
            <CardTitle>Detail Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm" style={{ color: colors.gray[700] }}>
            <p>Selected Node: Manifest Declaration</p>
            <p>Applications declare permissions in AndroidManifest.xml using uses-permission elements.</p>
            <p>Source: AOSP /docs/security/</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
