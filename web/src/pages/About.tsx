import { Card } from "@/components/ui/card";
import { colors } from "@/design/colors";

export function About() {
  return (
    <Card className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold tracking-normal" style={{ color: colors.gray[900] }}>关于项目</h1>
      <p className="mt-4 leading-7" style={{ color: colors.gray[700] }}>
        MobileSec Observatory 当前处于骨架阶段。此页面用于保留 `/about` 路由，后续可补充课程背景、引用方式和仓库信息。
      </p>
    </Card>
  );
}
