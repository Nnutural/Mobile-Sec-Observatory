export const typography = {
  fontFamily: {
    sans: '"Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
    serif: '"Source Serif Pro", "Source Han Serif", Georgia, serif',
    mono: '"JetBrains Mono", "SF Mono", Consolas, monospace',
  },
  
  fontSize: {
    xs:   ["0.75rem",  { lineHeight: "1rem" }],     // 12px - 图例、注脚
    sm:   ["0.875rem", { lineHeight: "1.25rem" }],  // 14px - 表格内容
    base: ["1rem",     { lineHeight: "1.5rem" }],   // 16px - 正文
    lg:   ["1.125rem", { lineHeight: "1.75rem" }],  // 18px - 卡片标题
    xl:   ["1.5rem",   { lineHeight: "2rem" }],     // 24px - 页面副标题
    "2xl":["2rem",     { lineHeight: "2.5rem" }],   // 32px - 页面标题
    "3xl":["2.5rem",   { lineHeight: "3rem" }],     // 40px - Hero
  },
  
  // 中文标题用思源黑体 Medium,数字用 Inter SemiBold
  weight: {
    normal: 400, medium: 500, semibold: 600, bold: 700,
  },
};
