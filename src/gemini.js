// Optional AI features, Bring-Your-Own-Key.
// The key is entered by the person using the app, kept only in this browser's
// localStorage, and sent only to Google's Gemini API in a request header.
// It never touches this repo, a server, or anyone else's account.

const API = "https://generativelanguage.googleapis.com/v1beta";
const KEY_STORE = "sg.geminiKey";
const MODEL_STORE = "sg.geminiModel";
const FALLBACK_MODEL = "gemini-flash-latest";

export const getKey = () => { try { return localStorage.getItem(KEY_STORE) || ""; } catch { return ""; } };
export const getModel = () => { try { return localStorage.getItem(MODEL_STORE) || ""; } catch { return ""; } };
export function saveKey(key) { localStorage.setItem(KEY_STORE, key.trim()); }
export function forgetKey() { localStorage.removeItem(KEY_STORE); localStorage.removeItem(MODEL_STORE); }
export const hasKey = () => getKey().length > 0;

async function call(path, { method = "GET", body } = {}) {
  const key = getKey();
  if (!key) throw new Error("Add your Gemini API key in Settings to use AI features.");
  const res = await fetch(`${API}/${path}`, {
    method,
    headers: { "x-goog-api-key": key, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message ?? `HTTP ${res.status}`;
    if (res.status === 400 && /API key/i.test(msg)) throw new Error("Gemini rejected the API key. Check it in Settings.");
    if (res.status === 429) throw new Error("Your Gemini quota is used up for now. Try again later.");
    throw new Error(`Gemini error: ${msg}`);
  }
  return json;
}

// Picks the newest general-purpose Flash model the key can use, so the app
// keeps working as Google releases new versions.
export function pickFlashModel(models) {
  const usable = models
    .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((n) => /flash/.test(n) && !/(lite|image|tts|live|audio|embedding|thinking|exp|preview)/.test(n));
  const version = (n) => (n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? "0").split(".").map(Number);
  usable.sort((a, b) => {
    const [a1, a2 = 0] = version(a), [b1, b2 = 0] = version(b);
    return b1 - a1 || b2 - a2 || a.length - b.length;
  });
  return usable[0] ?? FALLBACK_MODEL;
}

export async function verifyKeyAndPickModel() {
  const json = await call("models?pageSize=200");
  const model = pickFlashModel(json.models ?? []);
  localStorage.setItem(MODEL_STORE, model);
  return model;
}

async function generate(parts, schema) {
  const model = getModel() || FALLBACK_MODEL;
  const json = await call(`models/${model}:generateContent`, {
    method: "POST",
    body: {
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: schema },
    },
  });
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  try { return JSON.parse(text); } catch { throw new Error("Gemini returned an answer the app couldn't read. Try again."); }
}

const LABEL_SCHEMA = {
  type: "OBJECT",
  properties: {
    product_name: { type: "STRING" },
    ingredients_text: { type: "STRING" },
    additive_codes: { type: "ARRAY", items: { type: "STRING" } },
    is_organic: { type: "BOOLEAN" },
    readable: { type: "BOOLEAN" },
  },
  required: ["ingredients_text", "additive_codes", "is_organic", "readable"],
};

// Reads an ingredient-label photo and returns a product shaped like an
// Open Food Facts record, so the same scoring engine can rate it.
export async function readLabelPhoto(base64Jpeg) {
  const prompt =
    "This is a photo of a food package's ingredient list. Transcribe the ingredient list exactly. " +
    "Then list every food additive in it as an E-number code (for example E250 for sodium nitrite, " +
    "E322 for lecithin, E129 for Red 40), converting named additives to their E-numbers. " +
    "Set is_organic true only if the label shows an organic certification. " +
    "Set readable false if no ingredient list is visible.";
  const out = await generate([{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: base64Jpeg } }], LABEL_SCHEMA);
  if (!out.readable) throw new Error("No ingredient list found in that photo. Get closer and make sure the text is in focus.");
  return {
    code: null,
    product_name: out.product_name || "Photographed product",
    ingredients_text: out.ingredients_text,
    additives_tags: (out.additive_codes ?? []).map((c) => `en:${String(c).toLowerCase().replace(/[\s-]/g, "")}`),
    labels_tags: out.is_organic ? ["en:organic"] : [],
    nutriscore_grade: null,
    _source: "gemini-label",
  };
}

const EXPLAIN_SCHEMA = {
  type: "OBJECT",
  properties: { summary: { type: "STRING" }, tips: { type: "ARRAY", items: { type: "STRING" } } },
  required: ["summary", "tips"],
};

export async function explainScore(product, result) {
  const facts = {
    name: product.product_name, brand: product.brands, score: result.score, band: result.band.label,
    nutri_score: result.parts.nutrition.grade, nova_group: product.nova_group ?? null,
    additives: result.parts.additives.list.map((a) => `${a.code} ${a.name ?? ""} (${a.risk})`),
    organic: result.parts.organic.organic, ingredients: (product.ingredients_text ?? "").slice(0, 800),
  };
  const prompt =
    "You help a grocery shopper understand a product's health score. Using only these facts, " +
    "write a two-sentence plain-English summary of why it scored this way, then up to three short, " +
    "practical tips (what to look for instead, how often to have it). No medical claims. Facts: " +
    JSON.stringify(facts);
  return generate([{ text: prompt }], EXPLAIN_SCHEMA);
}
