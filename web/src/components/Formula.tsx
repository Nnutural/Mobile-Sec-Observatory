import { useEffect, useRef } from "react";
import katex from "katex";
import { colors } from "@/design/colors";

export interface FormulaProps {
  tex: string;
  block?: boolean;
}

export function Formula({ tex, block = false }: FormulaProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    try {
      katex.render(tex, node, {
        displayMode: block,
        throwOnError: false,
        output: "html",
        strict: "ignore",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      node.textContent = "";
      const fallback = document.createElement("div");
      fallback.style.color = colors.severity.critical;
      fallback.style.fontSize = "12px";
      fallback.textContent = `公式渲染错误：${message} · 原文：${tex}`;
      node.appendChild(fallback);
    }
  }, [tex, block]);

  if (block) {
    return (
      <div
        className="my-3 overflow-x-auto rounded-md border px-4 py-3"
        style={{ backgroundColor: colors.gray[50], borderColor: colors.gray[200] }}
      >
        <span ref={ref} aria-label="数学公式" />
      </div>
    );
  }

  return <span ref={ref} aria-label="数学公式" />;
}
