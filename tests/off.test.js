import { test } from "node:test";
import assert from "node:assert/strict";

// Minimal browser globals for src/off.js
globalThis.localStorage = { _s: {}, getItem(k) { return this._s[k] ?? null; }, setItem(k, v) { this._s[k] = String(v); } };
Object.defineProperty(globalThis, "navigator", { value: { onLine: true }, configurable: true });
const { fetchProduct, findBetterOptions } = await import("../src/off.js");

function mockFetch(responses) {
  let i = 0;
  globalThis.fetch = async () => {
    const r = responses[Math.min(i++, responses.length - 1)];
    if (r === "network") throw new TypeError("Failed to fetch");
    return { status: r.status, text: async () => JSON.stringify(r.body ?? {}) };
  };
  return () => i;
}

test("a busy response is retried once and then succeeds", async () => {
  const calls = mockFetch(["network", { status: 200, body: { status: 1, product: { code: "123456789", product_name: "X" } } }]);
  const { product, source } = await fetchProduct("123456789");
  assert.equal(product.product_name, "X");
  assert.equal(source, "live");
  assert.equal(calls(), 2);
});

test("a product that keeps failing falls back to a saved sample", async () => {
  mockFetch([{ status: 503 }]);
  const { source } = await fetchProduct("0030000010402", { samples: { "0030000010402": { code: "0030000010402" } } });
  assert.equal(source, "sample");
});

test("search that stays busy explains it in plain words", async () => {
  mockFetch(["network"]);
  await assert.rejects(
    findBetterOptions({ code: "1", nutriscore_grade: "c", categories_tags: ["en:breakfast-cereals"] }),
    /search is busy/,
  );
});
