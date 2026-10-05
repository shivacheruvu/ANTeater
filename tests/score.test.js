import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreProduct, band } from "../src/score.js";
import { normaliseCode, lookupAdditive } from "../src/additives.js";

test("perfect product: grade A, no additives, organic", () => {
  const r = scoreProduct({ nutriscore_grade: "a", additives_tags: [], additives_n: 0, labels_tags: ["en:organic"] });
  assert.equal(r.score, 100);
  assert.equal(r.band.key, "excellent");
});

test("grade E with no additives info is scored on nutrition + organic only", () => {
  const r = scoreProduct({ nutriscore_grade: "e" });
  assert.equal(r.parts.additives.known, false);
  assert.equal(r.scaled, true);
  assert.equal(r.score, 0);
});

test("additive penalties stack and floor at zero", () => {
  const r = scoreProduct({
    nutriscore_grade: "b",
    additives_tags: ["en:e102", "en:e110", "en:e129", "en:e211", "en:e951", "en:e955"],
  });
  assert.equal(r.parts.additives.points, 0); // 6 moderate x 6 = 36 > 30
  assert.equal(r.score, 45); // 45 + 0 + 0
});

test("any high-risk additive caps the score at 49", () => {
  const r = scoreProduct({ nutriscore_grade: "a", additives_tags: ["en:e250"], labels_tags: ["en:organic"] });
  // 60 + (30-12) + 10 = 88, capped
  assert.equal(r.score, 49);
  assert.equal(r.capped, true);
  assert.equal(r.band.key, "poor");
});

test("missing nutrition rescales additives + organic to 100", () => {
  const r = scoreProduct({ additives_tags: ["en:e330"], ingredients_text: "x" });
  // (30 + 0) / 40 = 75
  assert.equal(r.score, 75);
});

test("no nutrition and no ingredients means not enough data", () => {
  const r = scoreProduct({ labels_tags: ["en:organic"] });
  assert.equal(r.score, null);
  assert.equal(r.band.key, "unknown");
});

test("duplicate and variant additive tags are counted once", () => {
  const r = scoreProduct({ nutriscore_grade: "c", additives_tags: ["en:e471", "en:e471", "en:e322i"] });
  const codes = r.parts.additives.list.map((a) => a.code);
  assert.deepEqual(codes, ["E471", "E322"]);
});

test("additive code normalisation", () => {
  assert.equal(normaliseCode("en:e150d"), "e150d");
  assert.equal(normaliseCode("E 322"), "e322");
  assert.equal(normaliseCode("en:e471ii"), "e471");
  assert.equal(normaliseCode("en:e160a"), "e160a");
  assert.equal(normaliseCode("en:sugar"), null);
  assert.equal(lookupAdditive("en:e9999").risk, "unrated");
});

test("bands", () => {
  assert.equal(band(75).key, "excellent");
  assert.equal(band(74).key, "good");
  assert.equal(band(50).key, "good");
  assert.equal(band(49).key, "poor");
  assert.equal(band(24).key, "bad");
});
