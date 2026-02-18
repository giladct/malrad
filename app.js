const DATA_URL = "./assets/malrad_protocols.json";

/** @typedef {{id:string, category:string, title:string, startPage:number, endPage:number, content:string}} Protocol */

const els = {
  app: document.getElementById("app"),
  search: document.getElementById("search"),
  tabProtocols: document.getElementById("tab-protocols"),
  tabTools: document.getElementById("tab-tools"),
};

let protocols = /** @type {Protocol[]} */ ([]);
let selectedTab = "protocols";
let highlightDosing = true;

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isDosingish(token) {
  return (
    /mg\/kg|mcg\/kg|min|ml\/kg|units\/kg|מ\"ג\/ק\"ג|מ\"ל\/ק\"ג|ק\"ג|שעה|יממה|once daily|divided by/i.test(token) ||
    /\bCRP\b|\bANC\b|\bPCT\b/i.test(token)
  );
}

function highlightContent(text) {
  if (!highlightDosing) return escapeHtml(text);
  const safe = escapeHtml(text);
  // Lightweight highlighting: wrap common dosing / labs tokens.
  return safe.replace(
    /(\b\d+(?:\.\d+)?\s*(?:mg\/kg|mcg\/kg|min|ml\/kg|units\/kg|mg|mcg|ml)\b|(?:מ\"ג\/ק\"ג|מ\"ל\/ק\"ג|מ\"ג|מ\"ל)|\bCRP\b|\bANC\b|\bPCT\b)/gi,
    '<span class="hl">$1</span>'
  );
}

function groupByCategory(items) {
  /** @type {Map<string, Protocol[]>} */
  const map = new Map();
  for (const p of items) {
    const key = p.category || "כללי";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  }
  for (const [k, arr] of map.entries()) {
    arr.sort((a, b) => a.startPage - b.startPage);
    map.set(k, arr);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "he"));
}

function setTab(tab) {
  selectedTab = tab;
  els.tabProtocols.classList.toggle("is-active", tab === "protocols");
  els.tabTools.classList.toggle("is-active", tab === "tools");
  els.tabProtocols.setAttribute("aria-selected", tab === "protocols" ? "true" : "false");
  els.tabTools.setAttribute("aria-selected", tab === "tools" ? "true" : "false");

  if (tab === "tools") {
    els.search.value = "";
  }
}

function getQuery() {
  return (els.search.value || "").trim().toLowerCase();
}

function matchProtocol(p, q) {
  if (!q) return true;
  const hay = `${p.title}\n${p.category}\n${p.content}`.toLowerCase();
  return hay.includes(q);
}

function protocolById(id) {
  return protocols.find((p) => p.id === id) || null;
}

function navigateTo(hash) {
  if (location.hash === hash) return;
  location.hash = hash;
}

function renderProtocolsList() {
  const q = getQuery();
  const filtered = protocols.filter((p) => matchProtocol(p, q));
  const grouped = groupByCategory(filtered);

  const parts = [];

  parts.push(`
    <div class="section">
      <div class="section__header">
        <div class="section__title">כל הפרוטוקולים</div>
        <div class="pill">${filtered.length} תוצאות</div>
      </div>
    </div>
  `);

  for (const [cat, items] of grouped) {
    parts.push(`
      <div class="section">
        <div class="section__header">
          <div class="section__title">${escapeHtml(cat)}</div>
          <div class="pill">${items.length}</div>
        </div>
        <div class="list">
          ${items
            .map(
              (p) => `
                <div class="item" role="button" tabindex="0" data-protocol-id="${escapeHtml(p.id)}">
                  <div class="item__title">${escapeHtml(p.title)}</div>
                  <div class="item__meta">
                    <span><b>עמ׳</b> ${p.startPage}${p.endPage !== p.startPage ? `-${p.endPage}` : ""}</span>
                    ${q ? `<span class="pill">חיפוש</span>` : ""}
                  </div>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    `);
  }

  els.app.innerHTML = parts.join("");

  els.app.querySelectorAll("[data-protocol-id]").forEach((node) => {
    node.addEventListener("click", () => navigateTo(`#/protocol/${node.dataset.protocolId}`));
    node.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigateTo(`#/protocol/${node.dataset.protocolId}`);
      }
    });
  });
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function renderProtocolDetail(id) {
  const p = protocolById(id);
  if (!p) {
    els.app.innerHTML = `
      <div class="card protocol">
        <div class="protocol__title">לא נמצא</div>
        <div class="protocol__meta">הפרוטוקול לא קיים בקובץ הנתונים.</div>
        <div class="toolbar">
          <button class="btn btn--primary" id="back">חזרה</button>
        </div>
      </div>
    `;
    document.getElementById("back").addEventListener("click", () => navigateTo("#/"));
    return;
  }

  els.app.innerHTML = `
    <div class="card protocol">
      <div class="toolbar">
        <button class="btn btn--primary" id="back">חזרה</button>
        <button class="btn" id="copy">העתקה</button>
        <button class="btn" id="print">הדפסה</button>
        <button class="btn ${highlightDosing ? "btn--primary" : ""}" id="hl">
          ${highlightDosing ? "הדגשה: פועלת" : "הדגשה: כבויה"}
        </button>
      </div>

      <div class="protocol__title">${escapeHtml(p.title)}</div>
      <div class="protocol__meta">
        <span><b>קטגוריה</b> ${escapeHtml(p.category)}</span>
        <span><b>עמ׳</b> ${p.startPage}${p.endPage !== p.startPage ? `-${p.endPage}` : ""}</span>
        <span class="pill">${escapeHtml(p.id)}</span>
      </div>

      <div class="protocol__content" id="content">${highlightContent(p.content)}</div>
    </div>
  `;

  document.getElementById("back").addEventListener("click", () => navigateTo("#/"));
  document.getElementById("print").addEventListener("click", () => window.print());
  document.getElementById("hl").addEventListener("click", () => {
    highlightDosing = !highlightDosing;
    renderProtocolDetail(id);
  });

  document.getElementById("copy").addEventListener("click", async () => {
    const ok = await copyToClipboard(p.content);
    const btn = document.getElementById("copy");
    btn.textContent = ok ? "הועתק" : "לא ניתן להעתיק";
    setTimeout(() => (btn.textContent = "העתקה"), 1200);
  });
}

function numberOrNull(v) {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function renderTools() {
  els.app.innerHTML = `
    <div class="card protocol">
      <div class="protocol__title">כלים מהירים</div>
      <div class="protocol__meta">
        מחשבונים כלליים לשימוש קליני. יש לוודא מינונים/ריכוזים מול מקור מוסמך.
      </div>

      <div class="section">
        <div class="section__header">
          <div class="section__title">מחשבון מינון (mg/kg)</div>
          <div class="pill">Dose</div>
        </div>
        <div class="grid" style="margin-top:10px;">
          <div class="field">
            <label>משקל (ק״ג)</label>
            <input id="wKg" inputmode="decimal" placeholder="לדוגמה: 12.5" />
          </div>
          <div class="field">
            <label>מינון (mg/kg)</label>
            <input id="doseMgKg" inputmode="decimal" placeholder="לדוגמה: 50" />
          </div>
          <div class="field">
            <label>מקסימום (mg) — אופציונלי</label>
            <input id="maxMg" inputmode="decimal" placeholder="לדוגמה: 2000" />
          </div>
          <div class="field">
            <label>תדירות — אופציונלי</label>
            <input id="freq" placeholder="לדוגמה: פעם ביום / מחולק ל-3" />
          </div>
        </div>
        <div class="toolbar" style="margin-top:10px;">
          <button class="btn btn--primary" id="calcDose">חישוב</button>
          <button class="btn btn--danger" id="clearDose">איפוס</button>
        </div>
        <div class="result" id="doseOut" style="margin-top:10px;">
          הזן משקל ומינון כדי לקבל תוצאה.
        </div>
      </div>

      <div class="section">
        <div class="section__header">
          <div class="section__title">מחשבון אינפוזיה (mcg/kg/min → mL/hr)</div>
          <div class="pill">Infusion</div>
        </div>
        <div class="grid" style="margin-top:10px;">
          <div class="field">
            <label>משקל (ק״ג)</label>
            <input id="iwKg" inputmode="decimal" placeholder="לדוגמה: 18" />
          </div>
          <div class="field">
            <label>כמות תרופה בשקית (mg)</label>
            <input id="bagMg" inputmode="decimal" placeholder="לדוגמה: 5" />
          </div>
          <div class="field">
            <label>נפח שקית (mL)</label>
            <input id="bagMl" inputmode="decimal" placeholder="לדוגמה: 50" />
          </div>
          <div class="field">
            <label>מטרה (mcg/kg/min)</label>
            <input id="targetM" inputmode="decimal" placeholder="לדוגמה: 0.1" />
          </div>
        </div>
        <div class="toolbar" style="margin-top:10px;">
          <button class="btn btn--primary" id="calcInf">חישוב</button>
          <button class="btn btn--danger" id="clearInf">איפוס</button>
        </div>
        <div class="result" id="infOut" style="margin-top:10px;">
          הזן נתונים כדי לקבל קצב מתן ב-mL/hr.
        </div>
      </div>
    </div>
  `;

  const wKg = document.getElementById("wKg");
  const doseMgKg = document.getElementById("doseMgKg");
  const maxMg = document.getElementById("maxMg");
  const freq = document.getElementById("freq");
  const doseOut = document.getElementById("doseOut");

  function calcDose() {
    const w = numberOrNull(wKg.value);
    const d = numberOrNull(doseMgKg.value);
    const mx = numberOrNull(maxMg.value);
    const f = (freq.value || "").trim();

    if (!w || !d || w <= 0 || d <= 0) {
      doseOut.innerHTML = `נא להזין <b>משקל</b> ו-<b>mg/kg</b> תקינים.`;
      return;
    }
    let mg = w * d;
    let capped = false;
    if (mx && mx > 0 && mg > mx) {
      mg = mx;
      capped = true;
    }

    doseOut.innerHTML = `
      <div><b>תוצאה</b>: ${mg.toFixed(mg >= 10 ? 0 : 2)} mg</div>
      <div style="color:rgba(255,255,255,.72); font-size:12px; margin-top:6px;">
        חישוב: ${w}×${d} = ${(w * d).toFixed(2)} mg ${capped ? `(הוגבל למקסימום ${mx} mg)` : ""}
        ${f ? `<br/>תדירות: ${escapeHtml(f)}` : ""}
      </div>
    `;
  }

  document.getElementById("calcDose").addEventListener("click", calcDose);
  document.getElementById("clearDose").addEventListener("click", () => {
    wKg.value = "";
    doseMgKg.value = "";
    maxMg.value = "";
    freq.value = "";
    doseOut.textContent = "הזן משקל ומינון כדי לקבל תוצאה.";
  });

  const iwKg = document.getElementById("iwKg");
  const bagMg = document.getElementById("bagMg");
  const bagMl = document.getElementById("bagMl");
  const targetM = document.getElementById("targetM");
  const infOut = document.getElementById("infOut");

  function calcInf() {
    const w = numberOrNull(iwKg.value);
    const mg = numberOrNull(bagMg.value);
    const ml = numberOrNull(bagMl.value);
    const target = numberOrNull(targetM.value);
    if (!w || !mg || !ml || !target || w <= 0 || mg <= 0 || ml <= 0 || target <= 0) {
      infOut.innerHTML = `נא להזין ערכים תקינים.`;
      return;
    }

    const concMcgPerMl = (mg * 1000) / ml;
    const doseMcgPerMin = target * w;
    const mlPerMin = doseMcgPerMin / concMcgPerMl;
    const mlPerHr = mlPerMin * 60;

    infOut.innerHTML = `
      <div><b>קצב מתן</b>: ${mlPerHr.toFixed(2)} mL/hr</div>
      <div style="color:rgba(255,255,255,.72); font-size:12px; margin-top:6px;">
        ריכוז: ${(concMcgPerMl).toFixed(2)} mcg/mL<br/>
        מינון: ${(doseMcgPerMin).toFixed(2)} mcg/min → ${(mlPerMin).toFixed(4)} mL/min
      </div>
    `;
  }

  document.getElementById("calcInf").addEventListener("click", calcInf);
  document.getElementById("clearInf").addEventListener("click", () => {
    iwKg.value = "";
    bagMg.value = "";
    bagMl.value = "";
    targetM.value = "";
    infOut.textContent = "הזן נתונים כדי לקבל קצב מתן ב-mL/hr.";
  });
}

function parseRoute() {
  const h = location.hash || "#/";
  const m = /^#\/protocol\/(.+)$/.exec(h);
  if (m) return { name: "protocol", id: decodeURIComponent(m[1]) };
  if (h === "#/tools") return { name: "tools" };
  return { name: "home" };
}

function render() {
  const route = parseRoute();

  if (route.name === "tools") {
    setTab("tools");
    renderTools();
    return;
  }

  setTab("protocols");

  if (route.name === "protocol") {
    renderProtocolDetail(route.id);
  } else {
    renderProtocolsList();
  }
}

async function load() {
  const res = await fetch(DATA_URL, { cache: "no-cache" });
  const data = await res.json();
  protocols = (data.protocols || []).filter((p) => p && p.id && p.title);

  // Default to protocols tab; keep tools via hash.
  selectedTab = location.hash === "#/tools" ? "tools" : "protocols";
  render();
}

els.search.addEventListener("input", () => {
  if (selectedTab !== "protocols") return;
  if ((location.hash || "#/").startsWith("#/protocol/")) {
    navigateTo("#/");
  }
  renderProtocolsList();
});

els.tabProtocols.addEventListener("click", () => {
  navigateTo("#/");
  setTab("protocols");
  render();
});
els.tabTools.addEventListener("click", () => {
  navigateTo("#/tools");
  setTab("tools");
  render();
});

window.addEventListener("hashchange", render);

// PWA (optional)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

load().catch((e) => {
  els.app.innerHTML = `
    <div class="card protocol">
      <div class="protocol__title">שגיאה בטעינת נתונים</div>
      <div class="protocol__meta">${escapeHtml(String(e))}</div>
      <div class="protocol__content">ודא/י ש-<b>${escapeHtml(DATA_URL)}</b> קיים ושהאתר מוגש דרך שרת (לא כקובץ מקומי).</div>
    </div>
  `;
});

