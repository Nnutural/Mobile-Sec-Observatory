function rankWithTies(values: number[]): number[] {
  const indexed = values.map((value, index) => ({ value, index }));
  indexed.sort((a, b) => a.value - b.value);
  const ranks = new Array<number>(values.length).fill(0);

  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].value === indexed[i].value) {
      j += 1;
    }
    // 1-based ranks with average for ties
    const averageRank = (i + j + 2) / 2;
    for (let k = i; k <= j; k += 1) {
      ranks[indexed[k].index] = averageRank;
    }
    i = j + 1;
  }

  return ranks;
}

export function spearmanRank(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("spearmanRank: length mismatch");
  }
  if (a.length === 0) return 0;

  const rankA = rankWithTies(a);
  const rankB = rankWithTies(b);
  const n = a.length;

  const meanA = rankA.reduce((sum, value) => sum + value, 0) / n;
  const meanB = rankB.reduce((sum, value) => sum + value, 0) / n;

  let numerator = 0;
  let denomA = 0;
  let denomB = 0;
  for (let i = 0; i < n; i += 1) {
    const da = rankA[i] - meanA;
    const db = rankB[i] - meanB;
    numerator += da * db;
    denomA += da * da;
    denomB += db * db;
  }

  const denom = Math.sqrt(denomA * denomB);
  if (denom === 0) return 1;
  return numerator / denom;
}
