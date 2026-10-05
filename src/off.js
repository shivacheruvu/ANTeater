// Open Food Facts client. Reads need no API key.
// Limits (per IP): 15 product reads/min, 10 searches/min. Results are cached
// on the device so repeat scans never hit the network.
// Docs: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/

const BASE = "https://world.openfoodfacts.org";
export const PRODUCT_FIELDS = [
  "code", "product_name", "brands", "quantity", "image_front_small_url", "image_front_url",
  "nutriscore_grade", "nova_group", "additives_tags", "additives_n", "labels_tags",
  "ingredients_text", "categories_tags", "categories_tags_en", "countries_tags",
].join(",");

const CACHE_KEY = "sg.productCache.v1";
const CACHE_MAX = 300;

export class LookupError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind; // "not-found" | "rate-limited" | "offline" | "bad-code"
  }
}

export function cleanBarcode(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 14) return null;
  return digits;
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) ?? {}; } catch { return {}; }
}
function writeCache(cache) {
  const entries = Object.entries(cache).sort((a, b) => b[1].t - a[1].t).slice(0, CACHE_MAX);
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries))); } catch { /* storage full or blocked */ }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Open Food Facts' "busy" responses (429/503) don't carry CORS headers, so the
// browser reports them as a network error. Either way, wait briefly and retry once.
async function getJson(url, { retries = 1, busyMessage } = {}) {
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { Accept: "application/json" } });
    } catch {
      if (attempt < retries) { await sleep(2500); continue; }
      if (!navigator.onLine) throw new LookupError("offline", "You're offline. Connect and try again, or try a saved sample.");
      throw new LookupError("rate-limited", busyMessage ?? "Open Food Facts is busy right now. Wait a minute, or try a saved sample.");
    }
    if (res.status === 429 || res.status === 503) {
      if (attempt < retries) { await sleep(2500); continue; }
      throw new LookupError("rate-limited", busyMessage ?? "Open Food Facts is busy right now. Wait a minute, or try a saved sample.");
    }
    const text = await res.text();
    try { return JSON.parse(text); } catch {
      throw new LookupError("offline", `Open Food Facts returned an unexpected response (HTTP ${res.status}).`);
    }
  }
}

export async function fetchProduct(rawCode, { samples = {} } = {}) {
  const code = cleanBarcode(rawCode);
  if (!code) throw new LookupError("bad-code", "Barcodes are 8 to 14 digits. Check the number and try again.");

  const cache = readCache();
  const hit = cache[code] ?? cache[code.padStart(13, "0")];
  if (hit) return { product: hit.p, source: "cache" };

  try {
    // OFF stores UPC-A as EAN-13 with a leading zero; the API resolves both.
    const j = await getJson(`${BASE}/api/v2/product/${code}?fields=${PRODUCT_FIELDS}`);
    if (j.status !== 1 || !j.product) {
      throw new LookupError("not-found", "This product isn't in Open Food Facts yet. You can photograph its ingredient label instead.");
    }
    cache[code] = { p: j.product, t: Date.now() };
    writeCache(cache);
    return { product: j.product, source: "live" };
  } catch (err) {
    const saved = samples[code] ?? samples[code.padStart(13, "0")];
    if (saved && err.kind !== "not-found") return { product: saved, source: "sample" };
    throw err;
  }
}

// Most specific English category, e.g. "en:breakfast-cereals".
export function mainCategory(product) {
  const tags = product?.categories_tags ?? [];
  return [...tags].reverse().find((t) => /^en:[a-z0-9-]+$/.test(t)) ?? null;
}

export async function findBetterOptions(product, { country = "united-states" } = {}) {
  const category = mainCategory(product);
  if (!category) return [];
  const current = String(product.nutriscore_grade ?? "e").toLowerCase();
  const better = ["a", "b", "c", "d"].filter((g) => g < current || current === "unknown").slice(0, 2);
  if (better.length === 0) return [];
  const params = new URLSearchParams({
    categories_tags: category,
    nutrition_grades_tags: better.join("|"),
    fields: "code,product_name,brands,nutriscore_grade,additives_tags,labels_tags,image_front_small_url,ingredients_text",
    sort_by: "unique_scans_n",
    page_size: "12",
  });
  if (country) params.set("countries_tags", `en:${country}`);
  const j = await getJson(`${BASE}/api/v2/search?${params}`, {
    busyMessage: "Open Food Facts search is busy right now. Try again in a minute.",
  });
  return (j.products ?? []).filter((p) => p.code !== product.code && p.product_name);
}
