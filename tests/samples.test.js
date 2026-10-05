import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scoreProduct } from "../src/score.js";

const { products } = JSON.parse(readFileSync(new URL("../data/samples.json", import.meta.url)));

test("demo samples score across the full range", () => {
  const s = Object.fromEntries(Object.entries(products).map(([k, p]) => [p.product_name, scoreProduct(p).score]));
  assert.equal(s["Old Fashioned Oats"], 90);
  assert.equal(s["100% Whole Wheat Bread"], 90);
  assert.equal(s["Cheerios"], 58);
  assert.equal(s["SPAM Classic"], 33);
  assert.equal(s["Nutella"], 30);
  assert.equal(s["Coca-Cola Original"], 22);
});
