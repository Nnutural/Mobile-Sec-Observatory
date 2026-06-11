export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${formatNumber(value * 100, digits)}%`;
}

export function formatMonth(yyyymm: string): string {
  const [year, month] = yyyymm.split("-");
  if (!year || !month) return yyyymm;
  return `${year} 年 ${month.padStart(2, "0")} 月`;
}

export function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export function truncateMid(str: string, max = 18): string {
  if (str.length <= max) return str;
  if (max <= 3) return str.slice(0, max);
  const side = Math.floor((max - 1) / 2);
  const tail = max - 1 - side;
  return `${str.slice(0, side)}…${str.slice(str.length - tail)}`;
}
