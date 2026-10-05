// Additive risk reference used by the score.
// Risk tiers: "high", "moderate", "limited", "none".
// Notes summarise public regulatory positions or published studies. They are
// informational, not medical advice. Sources are listed in docs/METHODOLOGY.md.

const NITRITE_NOTE =
  "Used to cure meat. Nitrites and nitrates can form nitrosamines, and the WHO's cancer agency (IARC) classifies processed meat as carcinogenic.";
const SOUTHAMPTON_NOTE =
  "One of six colours that must carry an EU warning: 'may have an adverse effect on activity and attention in children'.";
const EMULSIFIER_NOTE =
  "Emulsifier. Animal and early human studies suggest it can disturb gut bacteria and the gut lining.";
const PHOSPHATE_NOTE =
  "Phosphate additive. High phosphate intake is linked to kidney and heart strain; EFSA set a group intake limit in 2019.";
const SULPHITE_NOTE =
  "Sulphite preservative. Can trigger reactions in people with asthma and must be declared as an allergen in the EU.";

export const ADDITIVES = {
  e249: { name: "Potassium nitrite", risk: "high", note: NITRITE_NOTE },
  e250: { name: "Sodium nitrite", risk: "high", note: NITRITE_NOTE },
  e251: { name: "Sodium nitrate", risk: "high", note: NITRITE_NOTE },
  e252: { name: "Potassium nitrate", risk: "high", note: NITRITE_NOTE },
  e171: {
    name: "Titanium dioxide",
    risk: "high",
    note: "Banned as a food additive in the EU since 2022 after EFSA could not rule out damage to DNA.",
  },
  e127: {
    name: "Erythrosine (Red No. 3)",
    risk: "high",
    note: "The US FDA revoked its approval in food in 2025 after it caused cancer in male rats.",
  },
  e320: {
    name: "BHA",
    risk: "high",
    note: "Synthetic antioxidant classified by IARC as possibly carcinogenic to humans (Group 2B).",
  },
  e924: {
    name: "Potassium bromate",
    risk: "high",
    note: "Flour improver banned in the EU and classified by IARC as possibly carcinogenic (Group 2B).",
  },

  e102: { name: "Tartrazine", risk: "moderate", note: SOUTHAMPTON_NOTE },
  e104: { name: "Quinoline yellow", risk: "moderate", note: SOUTHAMPTON_NOTE },
  e110: { name: "Sunset yellow", risk: "moderate", note: SOUTHAMPTON_NOTE },
  e122: { name: "Azorubine", risk: "moderate", note: SOUTHAMPTON_NOTE },
  e124: { name: "Ponceau 4R", risk: "moderate", note: SOUTHAMPTON_NOTE },
  e129: { name: "Allura red (Red 40)", risk: "moderate", note: SOUTHAMPTON_NOTE },
  e150d: {
    name: "Sulphite ammonia caramel",
    risk: "moderate",
    note: "Caramel colour that can contain 4-MEI, classified by IARC as possibly carcinogenic (Group 2B).",
  },
  e211: {
    name: "Sodium benzoate",
    risk: "moderate",
    note: "Preservative that can form benzene alongside vitamin C (E300) in drinks; also part of the Southampton hyperactivity study.",
  },
  e220: { name: "Sulphur dioxide", risk: "moderate", note: SULPHITE_NOTE },
  e223: { name: "Sodium metabisulphite", risk: "moderate", note: SULPHITE_NOTE },
  e224: { name: "Potassium metabisulphite", risk: "moderate", note: SULPHITE_NOTE },
  e319: {
    name: "TBHQ",
    risk: "moderate",
    note: "Synthetic antioxidant with effects in animal studies at high doses; EFSA sets a strict daily limit.",
  },
  e321: {
    name: "BHT",
    risk: "moderate",
    note: "Synthetic antioxidant with mixed evidence from animal studies; EFSA sets a strict daily limit.",
  },
  e407: {
    name: "Carrageenan",
    risk: "moderate",
    note: "Thickener linked to gut inflammation in animal studies; EFSA asked for more safety data in 2018.",
  },
  e433: { name: "Polysorbate 80", risk: "moderate", note: EMULSIFIER_NOTE },
  e466: { name: "Carboxymethylcellulose", risk: "moderate", note: EMULSIFIER_NOTE },
  e471: {
    name: "Mono- and diglycerides of fatty acids",
    risk: "moderate",
    note: "Emulsifier associated with higher cardiovascular risk in the large French NutriNet-Santé study (an association, not proof).",
  },
  e950: {
    name: "Acesulfame K",
    risk: "moderate",
    note: "Sweetener associated with cancer and cardiovascular risk in the NutriNet-Santé study (observational evidence).",
  },
  e951: {
    name: "Aspartame",
    risk: "moderate",
    note: "IARC classified aspartame as possibly carcinogenic (Group 2B) in 2023; JECFA kept its daily intake limit.",
  },
  e952: {
    name: "Cyclamate",
    risk: "moderate",
    note: "Sweetener not permitted in food in the United States.",
  },
  e955: {
    name: "Sucralose",
    risk: "moderate",
    note: "A 2023 lab study raised concerns about a breakdown product, sucralose-6-acetate.",
  },
  e968: {
    name: "Erythritol",
    risk: "moderate",
    note: "A 2023 study linked high blood levels of erythritol to a higher risk of blood clots.",
  },

  e338: { name: "Phosphoric acid", risk: "limited", note: PHOSPHATE_NOTE },
  e339: { name: "Sodium phosphates", risk: "limited", note: PHOSPHATE_NOTE },
  e340: { name: "Potassium phosphates", risk: "limited", note: PHOSPHATE_NOTE },
  e341: { name: "Calcium phosphates", risk: "limited", note: PHOSPHATE_NOTE },
  e450: { name: "Diphosphates", risk: "limited", note: PHOSPHATE_NOTE },
  e451: { name: "Triphosphates", risk: "limited", note: PHOSPHATE_NOTE },
  e452: { name: "Polyphosphates", risk: "limited", note: PHOSPHATE_NOTE },
  e954: {
    name: "Saccharin",
    risk: "limited",
    note: "Older sweetener; current evidence does not show harm at normal intake.",
  },
  e621: {
    name: "Monosodium glutamate (MSG)",
    risk: "limited",
    note: "Considered safe at normal intake; some people report short-term sensitivity.",
  },
  e385: {
    name: "Calcium disodium EDTA",
    risk: "limited",
    note: "Preservative considered safe within the EFSA daily limit.",
  },

  e300: { name: "Ascorbic acid (vitamin C)", risk: "none" },
  e306: { name: "Tocopherols (vitamin E)", risk: "none" },
  e322: { name: "Lecithins", risk: "none" },
  e330: { name: "Citric acid", risk: "none" },
  e331: { name: "Sodium citrates", risk: "none" },
  e260: { name: "Acetic acid", risk: "none" },
  e270: { name: "Lactic acid", risk: "none" },
  e160a: { name: "Carotenes", risk: "none" },
  e170: { name: "Calcium carbonate", risk: "none" },
  e290: { name: "Carbon dioxide", risk: "none" },
  e410: { name: "Locust bean gum", risk: "none" },
  e412: { name: "Guar gum", risk: "none" },
  e415: { name: "Xanthan gum", risk: "none" },
  e440: { name: "Pectins", risk: "none" },
  e500: { name: "Sodium carbonates (baking soda)", risk: "none" },
};

// Normalises "en:e322i", "E322", "e-322" to "e322". Sub-variants (e322i, e471ii)
// fall back to their parent code when the exact variant is not listed.
export function normaliseCode(raw) {
  if (!raw) return null;
  const m = String(raw).toLowerCase().replace(/^en:/, "").replace(/[\s-]/g, "").match(/^e(\d{3,4})([a-z]*)/);
  if (!m) return null;
  const full = `e${m[1]}${m[2]}`;
  if (ADDITIVES[full]) return full;
  // keep letter suffixes that are part of the official code (e150d, e160a)
  const withFirstLetter = `e${m[1]}${m[2].slice(0, 1)}`;
  if (ADDITIVES[withFirstLetter]) return withFirstLetter;
  return `e${m[1]}`;
}

export function lookupAdditive(raw) {
  const code = normaliseCode(raw);
  if (!code) return null;
  const info = ADDITIVES[code];
  return {
    code: code.toUpperCase(),
    name: info?.name ?? null,
    risk: info?.risk ?? "unrated",
    note: info?.note ?? null,
  };
}
