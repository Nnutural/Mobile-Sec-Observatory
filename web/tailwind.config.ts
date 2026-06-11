import type { Config } from "tailwindcss";
import { colors } from "./src/design/colors";
import { typography } from "./src/design/typography";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors,
      fontFamily: typography.fontFamily,
      fontSize: typography.fontSize as any,
    },
  },
  plugins: [],
} satisfies Config;
