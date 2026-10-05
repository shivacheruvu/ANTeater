import { test } from "node:test";
import assert from "node:assert/strict";
import { pickFlashModel } from "../src/gemini.js";

const m = (name, methods = ["generateContent"]) => ({ name: `models/${name}`, supportedGenerationMethods: methods });

test("picks the newest general Flash model", () => {
  const models = [m("gemini-2.5-flash"), m("gemini-3.6-flash"), m("gemini-3.8-flash"), m("gemini-3.8-flash-lite"),
    m("gemini-3.8-flash-image"), m("gemini-3.8-pro"), m("text-embedding-004", ["embedContent"])];
  assert.equal(pickFlashModel(models), "gemini-3.8-flash");
});

test("falls back to the alias when nothing matches", () => {
  assert.equal(pickFlashModel([m("gemini-3.8-pro")]), "gemini-flash-latest");
});
