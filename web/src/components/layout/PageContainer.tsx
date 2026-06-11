import type { PropsWithChildren } from "react";
import { colors } from "@/design/colors";
import { spacing } from "@/design/spacing";

export function PageContainer({ children }: PropsWithChildren) {
  return (
    <main
      className="mx-auto w-full py-8"
      style={{
        maxWidth: spacing.contentMaxWidth,
        paddingLeft: spacing.pageMargin,
        paddingRight: spacing.pageMargin,
        color: colors.gray[900],
      }}
    >
      {children}
    </main>
  );
}
