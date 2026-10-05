// ANTeater score: 0–100, built from three parts.
//   Nutrition  60 pts  – from the product's Nutri-Score grade (A–E)
//   Additives  30 pts  – minus points for each risky additive
//   Organic    10 pts  – certified organic label
// If any high-risk additive is present the total is capped at 49.
// When a part is unknown (e.g. no Nutri-Score), the remaining parts are scaled
// up to 100 so missing data doesn't make a product look worse than it is.
// Full write-up: docs/METHODOLOGY.md

import { lookupAdditive } from "./additives.js";

export const WEIGHTS = { nutrition: 60, additives: 30, organic: 10 };
const GRADE_POINTS = { a: 60, b: 45, c: 30, d: 15, e: 0 };
const ADDITIVE_PENALTY = { high: 12, moderate: 6, limited: 2, none: 0, unrated: 0 };
const HIGH_RISK_CAP = 49;
const ORGANIC_TAGS = ["en:organic", "en:eu-organic", "en:usda-organic", "en:certified-organic", "en:bio"];

export function band(score) {
  if (score == null) return { key: "unknown", label: "Not enough data" };
  if (score >= 75) return { key: "excellent", label: "Excellent" };
  if (score >= 50) return { key: "good", label: "Good" };
  if (score >= 25) return { key: "poor", label: "Poor" };
  return { key: "bad", label: "Bad" };
}

export function scoreProduct(product) {
  const p = product ?? {};
  const grade = String(p.nutriscore_grade ?? p.nutrition_grades ?? "").toLowerCase();
  const nutrition = grade in GRADE_POINTS
    ? { known: true, points: GRADE_POINTS[grade], max: WEIGHTS.nutrition, grade: grade.toUpperCase() }
    : { known: false, points: 0, max: WEIGHTS.nutrition, grade: null };

  const tags = Array.isArray(p.additives_tags) ? p.additives_tags : [];
  const seen = new Set();
  const additives = [];
  for (const t of tags) {
    const a = lookupAdditive(t);
    if (!a || seen.has(a.code)) continue;
    seen.add(a.code);
    additives.push(a);
  }
  const order = { high: 0, moderate: 1, limited: 2, unrated: 3, none: 4 };
  additives.sort((x, y) => order[x.risk] - order[y.risk] || x.code.localeCompare(y.code));
  const penalty = additives.reduce((s, a) => s + ADDITIVE_PENALTY[a.risk], 0);
  // Additives are only "known" if we have an ingredient list to judge from.
  const additivesKnown = tags.length > 0 || Boolean(p.ingredients_text) || p.additives_n === 0;
  const additivePart = {
    known: additivesKnown,
    points: additivesKnown ? Math.max(0, WEIGHTS.additives - penalty) : 0,
    max: WEIGHTS.additives,
    list: additives,
  };

  const labels = Array.isArray(p.labels_tags) ? p.labels_tags : [];
  const isOrganic = labels.some((l) => ORGANIC_TAGS.includes(String(l).toLowerCase()));
  const organic = { known: true, points: isOrganic ? WEIGHTS.organic : 0, max: WEIGHTS.organic, organic: isOrganic };

  const parts = { nutrition, additives: additivePart, organic };
  const knownMax = Object.values(parts).reduce((s, x) => s + (x.known ? x.max : 0), 0);
  const knownPts = Object.values(parts).reduce((s, x) => s + (x.known ? x.points : 0), 0);

  // Organic alone is not enough to score a product.
  if (!nutrition.known && !additivePart.known) {
    return { score: null, band: band(null), parts, capped: false, scaled: false };
  }

  let score = Math.round((knownPts / knownMax) * 100);
  const hasHigh = additives.some((a) => a.risk === "high");
  const capped = hasHigh && score > HIGH_RISK_CAP;
  if (capped) score = HIGH_RISK_CAP;

  return { score, band: band(score), parts, capped, scaled: knownMax < 100 };
}
