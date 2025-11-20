export function pct(v) {
  if (v == null) return "–";
  const num = v * 100;
  const truncated = Math.trunc(num * 100) / 100;
  return truncated.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " %";
}

export function formatRisk(v) {
  if (v == null) return "–";
  const truncated = Math.trunc(v * 100) / 100;
  return truncated.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " %";
}

export function formatSharpe(v) {
  if (v == null) return "–";
  return Number(v).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function money(v) {
  if (v == null) return "–";
  return new Intl.NumberFormat("fr-FR").format(v) + " €";
}
