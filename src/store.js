// Scan history and spending, stored only on this device.
const HISTORY_KEY = "sg.history.v1";
const MAX = 500;

export function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) ?? []; } catch { return []; }
}
function save(list) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX))); } catch { /* storage blocked */ }
}

export function addScan(entry) {
  const list = loadHistory();
  const item = { id: crypto.randomUUID(), at: new Date().toISOString(), price: null, ...entry };
  list.unshift(item);
  save(list);
  return item;
}

export function setPrice(id, price) {
  const list = loadHistory();
  const it = list.find((x) => x.id === id);
  if (it) { it.price = price; save(list); }
}

export function clearHistory() { save([]); }

export function monthSummary(list = loadHistory(), now = new Date()) {
  const ym = now.toISOString().slice(0, 7);
  const month = list.filter((x) => x.at.startsWith(ym));
  const priced = month.filter((x) => typeof x.price === "number");
  const scored = month.filter((x) => typeof x.score === "number");
  return {
    scans: month.length,
    spend: priced.reduce((s, x) => s + x.price, 0),
    pricedCount: priced.length,
    avgScore: scored.length ? Math.round(scored.reduce((s, x) => s + x.score, 0) / scored.length) : null,
    lowScoreSpend: priced.filter((x) => typeof x.score === "number" && x.score < 50).reduce((s, x) => s + x.price, 0),
  };
}

const csvCell = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
export function toCsv(list = loadHistory()) {
  const cols = ["at", "barcode", "name", "brand", "score", "band", "nutri_score", "nova_group", "additives", "organic", "price", "source"];
  const rows = list.map((x) => cols.map((c) => csvCell(Array.isArray(x[c]) ? x[c].join(" ") : x[c])).join(","));
  return [cols.join(","), ...rows].join("\n");
}
