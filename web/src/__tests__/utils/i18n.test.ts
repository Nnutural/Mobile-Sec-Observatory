import { describe, expect, it } from "vitest";
import { colors } from "@/design/colors";
import {
  CATEGORY_ZH_FALLBACK,
  COMPONENT_CATEGORY_LABEL,
  SEVERITY_LABEL,
  categoryColor,
  severityColor,
} from "@/utils/i18n";

describe("i18n mappings", () => {
  it("maps severity and component labels to Chinese", () => {
    expect(SEVERITY_LABEL.Critical).toBe("严重");
    expect(SEVERITY_LABEL.High).toBe("高危");
    expect(COMPONENT_CATEGORY_LABEL.Framework).toBe("框架层");
    expect(CATEGORY_ZH_FALLBACK.Development).toBe("开发工具");
    expect(severityColor("Critical")).toBe(colors.severity.critical);
    expect(typeof categoryColor("Development")).toBe("string");
  });
});
