import { scoreProduct, band } from "./score.js";
import { fetchProduct, findBetterOptions, cleanBarcode, LookupError } from "./off.js";
import { startScanner } from "./scanner.js";
import * as gemini from "./gemini.js";
import * as store from "./store.js";

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => `$${(n ?? 0).toFixed(2)}`;
const REGION_KEY = "sg.region";
const RISK_WORD = { high: "High risk", moderate: "Moderate risk", limited: "Limited risk", none: "No known risk", unrated: "Not rated" };
const SOURCE_WORD = {
  live: "Live from Open Food Facts",
  cache: "Saved on this device",
  sample: "Saved sample (Open Food Facts snapshot)",
  photo: "Read from your photo by Gemini",
};

let samples = {};
let stopCamera = null;
let current = null; // { product, result, entryId, source }

/* ---------- Routing ---------- */
const VIEWS = ["scan", "result", "history", "settings"];
function show(view) {
  for (const v of VIEWS) $(`#view-${v}`).hidden = v !== view;
  const tab = view === "result" ? "scan" : view;
  document.querySelectorAll(".tabs a").forEach((a) => {
    if (a.dataset.tab === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  if (view !== "scan") stopScan();
  if (view === "history") renderHistory();
  if (view === "settings") renderSettings();
  window.scrollTo(0, 0);
}
function route() {
  const h = location.hash.slice(1) || "scan";
  if (h === "result" && !current) return show("scan");
  show(VIEWS.includes(h) ? h : "scan");
}
window.addEventListener("hashchange", route);

/* ---------- Scan ---------- */
function setStatus(msg, isError = false) {
  const el = $("#scan-status");
  el.textContent = msg;
  el.classList.toggle("error", isError);
}

async function beginScan() {
  setStatus("");
  $("#viewfinder").hidden = false;
  $("#start-scan").hidden = true;
  try {
    stopCamera = await startScanner($("#video"), (code) => {
      stopScan();
      navigator.vibrate?.(60);
      lookup(code);
    });
  } catch (err) {
    stopScan();
    const denied = err?.name === "NotAllowedError";
    setStatus(denied ? "Camera access was blocked. Allow it in your browser settings, or type the barcode below." : (err.message || "The camera couldn't start. Type the barcode below."), true);
  }
}
function stopScan() {
  stopCamera?.();
  stopCamera = null;
  $("#viewfinder").hidden = true;
  $("#start-scan").hidden = false;
}

async function lookup(raw) {
  const code = cleanBarcode(raw);
  if (!code) return setStatus("Barcodes are 8 to 14 digits. Check the number and try again.", true);
  setStatus(`Looking up ${code}…`);
  try {
    const { product, source } = await fetchProduct(code, { samples });
    open(product, source);
    setStatus("");
  } catch (err) {
    setStatus(err instanceof LookupError ? err.message : "Something went wrong looking that up. Try again.", true);
  }
}

function open(product, source, { record = true, entryId = null } = {}) {
  const result = scoreProduct(product);
  let id = entryId;
  if (record) {
    id = store.addScan({
      barcode: product.code ?? null,
      name: product.product_name ?? "Unnamed product",
      brand: product.brands ?? "",
      score: result.score,
      band: result.band.key,
      nutri_score: result.parts.nutrition.grade,
      nova_group: product.nova_group ?? null,
      additives: result.parts.additives.list.map((a) => a.code),
      organic: result.parts.organic.organic,
      source,
      product: slim(product),
    }).id;
  }
  current = { product, result, entryId: id, source };
  renderResult();
  if (location.hash !== "#result") location.hash = "result"; else show("result");
}

function slim(p) {
  const keep = ["code", "product_name", "brands", "quantity", "image_front_small_url", "nutriscore_grade", "nova_group", "additives_tags", "additives_n", "labels_tags", "ingredients_text", "categories_tags"];
  const o = Object.fromEntries(keep.filter((k) => p[k] != null).map((k) => [k, p[k]]));
  if (o.ingredients_text) o.ingredients_text = o.ingredients_text.slice(0, 600);
  return o;
}

/* ---------- Result ---------- */
function partRow(label, part, why) {
  if (!part.known) {
    return `<div class="part"><span class="what">${label}</span><span class="pts">—</span><span class="why">${why}</span></div>`;
  }
  const pct = Math.round((part.points / part.max) * 100);
  return `<div class="part"><span class="what">${label}</span><span class="pts">${part.points} / ${part.max}</span>
    <span class="bar" aria-hidden="true"><span style="width:${pct}%"></span></span><span class="why">${why}</span></div>`;
}

function renderResult() {
  const { product: p, result: r, source } = current;
  const n = r.parts.nutrition, a = r.parts.additives, o = r.parts.organic;
  const nutriWhy = n.known ? `Nutri-Score ${n.grade}` : "No Nutri-Score for this product, so the other parts are scaled up.";
  const addWhy = !a.known ? "No ingredient list to check." :
    a.list.length === 0 ? "No additives listed." :
    `${a.list.length} additive${a.list.length > 1 ? "s" : ""} found`;
  const entry = store.loadHistory().find((x) => x.id === current.entryId);

  const addList = a.list.length
    ? `<ul class="additives">${a.list.map((x) => x.note
        ? `<li><details><summary><span class="dot ${x.risk}"></span><span class="code">${x.code}</span><span>${esc(x.name)}</span><span class="risk">${RISK_WORD[x.risk]}</span></summary><p>${esc(x.note)}</p></details></li>`
        : `<li><div class="plain"><span class="dot ${x.risk}"></span><span class="code">${x.code}</span><span>${esc(x.name ?? "Unlisted additive")}</span><span class="risk">${RISK_WORD[x.risk]}</span></div></li>`).join("")}</ul>`
    : `<ul class="additives"><li><p class="empty">${a.known ? "None. Nice." : "We couldn't check additives for this product."}</p></li></ul>`;

  $("#view-result").innerHTML = `
    <article class="tag reveal" data-band="${r.band.key}" aria-label="Score ${r.score ?? "unknown"} out of 100, ${r.band.label}">
      <div class="tag-score">
        <span class="num">${r.score ?? "?"}</span><span class="of">out of 100</span><span class="word">${r.band.label}</span>
      </div>
      <div class="tag-body">
        <h2>${esc(p.product_name || "Unnamed product")}</h2>
        <span class="brand">${esc([p.brands, p.quantity].filter(Boolean).join(", "))}</span>
        ${p.image_front_small_url ? `<img src="${esc(p.image_front_small_url)}" alt="" loading="lazy" onerror="this.remove()" />` : ""}
        ${p.code ? `<span class="barcode">${esc(p.code)}</span>` : ""}
        <span class="source">${SOURCE_WORD[source] ?? ""}</span>
      </div>
    </article>

    ${r.capped ? `<p class="note">Capped at 49 because it contains a high-risk additive.</p>` : ""}
    ${p.nova_group === 4 ? `<p class="note">Ultra-processed food (NOVA group 4).</p>` : ""}

    <div class="scorecard">
      ${partRow("Nutrition", n, nutriWhy)}
      ${partRow("Additives", a, addWhy)}
      ${partRow("Organic", o, o.organic ? "Certified organic" : "Not certified organic")}
    </div>

    <h3 class="section-h">Additives</h3>
    ${addList}

    <div class="actions">
      ${gemini.hasKey() ? `<button class="btn btn-quiet" id="explain" type="button">Explain this score with AI</button><div id="explain-out"></div>` : ""}
      ${p.code && n.grade !== "A" ? `<button class="btn" id="find-better" type="button">Find a better option</button><div id="alts-out"></div>` : ""}
      <form class="price-row" id="price-form">
        <label for="price" class="sr">What did you pay?</label>
        <span class="prefix">$</span>
        <input id="price" inputmode="decimal" placeholder="Price paid (optional)" value="${entry?.price ?? ""}" />
        <button class="btn btn-quiet" type="submit">Save</button>
      </form>
      <a class="btn btn-primary" href="#scan">Scan another</a>
    </div>`;

  $("#explain")?.addEventListener("click", onExplain);
  $("#find-better")?.addEventListener("click", onFindBetter);
  $("#price-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = parseFloat($("#price").value.replace(/[^0-9.]/g, ""));
    store.setPrice(current.entryId, Number.isFinite(v) ? Math.round(v * 100) / 100 : null);
    $("#price-form button").textContent = "Saved";
  });
}

async function onExplain(e) {
  const btn = e.currentTarget, out = $("#explain-out");
  btn.disabled = true; btn.textContent = "Asking Gemini…";
  try {
    const { summary, tips } = await gemini.explainScore(current.product, current.result);
    out.innerHTML = `<div class="ai-box"><p>${esc(summary)}</p>${tips?.length ? `<ul>${tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}</div>`;
    btn.remove();
  } catch (err) {
    out.innerHTML = `<p class="status error">${esc(err.message)}</p>`;
    btn.disabled = false; btn.textContent = "Explain this score with AI";
  }
}

async function onFindBetter(e) {
  const btn = e.currentTarget, out = $("#alts-out");
  btn.disabled = true; btn.textContent = "Searching…";
  try {
    const found = await findBetterOptions(current.product, { country: localStorage.getItem(REGION_KEY) ?? "united-states" });
    const mine = current.result.score ?? 0;
    const scored = found.map((p) => ({ p, r: scoreProduct(p) }))
      .filter(({ r }) => r.score != null && r.score > mine)
      .sort((x, y) => y.r.score - x.r.score)
      .slice(0, 5);
    out.innerHTML = scored.length
      ? `<ul class="alts">${scored.map(({ p, r }) => `<li class="alt"><span class="mini" data-band="${r.band.key}">${r.score}</span>
          <div><b>${esc(p.product_name)}</b><span>${esc(p.brands ?? "")} · Nutri-Score ${esc((p.nutriscore_grade ?? "?").toUpperCase())}</span></div></li>`).join("")}</ul>`
      : `<p class="status">No higher-scoring products found in this category yet.</p>`;
    btn.remove();
  } catch (err) {
    out.innerHTML = `<p class="status error">${esc(err.message ?? "Search failed. Try again in a minute.")}</p>`;
    btn.disabled = false; btn.textContent = "Find a better option";
  }
}

/* ---------- Label photo (Gemini BYOK) ---------- */
async function onPhoto(e) {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  if (!gemini.hasKey()) {
    setStatus("Add your Gemini API key in Settings to read ingredient photos.", true);
    return;
  }
  setStatus("Reading the ingredient list…");
  try {
    const b64 = await downscaleToBase64(file, 1600);
    const product = await gemini.readLabelPhoto(b64);
    open(product, "photo");
    setStatus("");
  } catch (err) {
    setStatus(err.message, true);
  }
}

function downscaleToBase64(file, maxSide) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.85).split(",")[1]);
    };
    img.onerror = () => reject(new Error("That photo couldn't be opened. Try another."));
    img.src = URL.createObjectURL(file);
  });
}

/* ---------- History ---------- */
function renderHistory() {
  const list = store.loadHistory();
  const s = store.monthSummary(list);
  $("#summary").innerHTML = `
    <div class="stat"><b>${s.scans}</b><span>products scanned</span></div>
    <div class="stat"><b>${s.avgScore ?? "—"}</b><span>average score</span></div>
    <div class="stat"><b>${money(s.spend)}</b><span>spent (${s.pricedCount} priced)</span></div>
    <div class="stat"><b>${money(s.lowScoreSpend)}</b><span>on Poor or Bad items</span></div>`;
  $("#history-list").innerHTML = list.length
    ? list.slice(0, 100).map((x) => `<li><button type="button" data-id="${x.id}">
        <span class="mini" data-band="${x.band ?? band(x.score).key}">${x.score ?? "?"}</span>
        <span><b>${esc(x.name)}</b><br /><span class="when">${new Date(x.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span></span>
        <span class="price">${typeof x.price === "number" ? money(x.price) : ""}</span></button></li>`).join("")
    : `<li><p class="empty">Nothing yet. Scan a product and it shows up here.</p></li>`;
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Settings ---------- */
function renderSettings() {
  const has = gemini.hasKey();
  $("#forget-key").hidden = !has;
  $("#gemini-key").value = "";
  $("#gemini-key").placeholder = has ? "Key saved on this device" : "Paste your key";
  $("#key-status").textContent = has ? `Using ${gemini.getModel() || "the default Flash model"}.` : "";
  $("#region").value = localStorage.getItem(REGION_KEY) ?? "united-states";
}

/* ---------- Boot ---------- */
async function boot() {
  try {
    samples = (await (await fetch("data/samples.json")).json()).products ?? {};
  } catch { samples = {}; }

  $("#sample-chips").innerHTML = Object.values(samples).map((p) =>
    `<button class="chip" type="button" data-code="${p.code}"><img src="${esc(p.image_front_small_url)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'" />${esc(p.product_name)}</button>`).join("");
  $("#sample-chips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-code]");
    if (b) open(samples[b.dataset.code], "sample");
  });

  $("#start-scan").addEventListener("click", beginScan);
  $("#stop-scan").addEventListener("click", stopScan);
  $("#manual-form").addEventListener("submit", (e) => { e.preventDefault(); lookup($("#manual-code").value); });
  $("#label-photo").addEventListener("change", onPhoto);
  $("#photo-hint").textContent = gemini.hasKey()
    ? "Gemini reads the ingredients and the same score is applied. Nutrition can't be read from a photo, so it's scored on additives and organic only."
    : "Uses Gemini with your own API key. Add it in Settings.";

  $("#history-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-id]");
    const x = b && store.loadHistory().find((h) => h.id === b.dataset.id);
    if (x?.product) open(x.product, x.source, { record: false, entryId: x.id });
  });
  $("#export-csv").addEventListener("click", () => download("anteater-history.csv", store.toCsv(), "text/csv"));
  $("#export-json").addEventListener("click", () => download("anteater-history.json",
    JSON.stringify(store.loadHistory().map(({ product, ...rest }) => rest), null, 2), "application/json"));
  $("#clear-history").addEventListener("click", () => {
    if (confirm("Delete all scan history on this device?")) { store.clearHistory(); renderHistory(); }
  });

  $("#key-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const key = $("#gemini-key").value.trim();
    if (!key) return;
    const st = $("#key-status");
    st.classList.remove("error");
    st.textContent = "Checking the key with Google…";
    gemini.saveKey(key);
    try {
      const model = await gemini.verifyKeyAndPickModel();
      st.textContent = `Key works. Using ${model}.`;
      renderSettings();
      $("#photo-hint").textContent = "Gemini reads the ingredients and the same score is applied.";
    } catch (err) {
      gemini.forgetKey();
      st.classList.add("error");
      st.textContent = err.message;
    }
  });
  $("#forget-key").addEventListener("click", () => { gemini.forgetKey(); renderSettings(); $("#key-status").textContent = "Key removed from this device."; });
  $("#region").addEventListener("change", (e) => localStorage.setItem(REGION_KEY, e.target.value));

  // Shareable deep link: ?code=0016000275287
  const qCode = new URLSearchParams(location.search).get("code");
  route();
  if (qCode) lookup(qCode);

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}

boot();
