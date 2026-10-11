/* Auckland study cafes — front-end only. The data is a static module
   (cafes.js); edits to it are commits. Filter state lives in the URL hash,
   so any view, including a single open cafe, can be bookmarked or shared. */

import { cafes, regions } from "./cafes.js";

const byId = new Map(cafes.map(c => [c.id, c]));

const POWER = {
  plenty: "Plenty of power points",
  some: "Some power points",
  none: "No power points listed",
  unknown: "Power not mentioned",
};

const $ = sel => document.querySelector(sel);
const esc = s => String(s).replace(/[&<>"']/g, ch =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

/* --- State, mirrored to the hash ------------------------------------ */

const state = {
  q: "",
  area: "all",
  flags: new Set(),
  prices: new Set(),
  sort: "rating",
  open: null,
};

function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  state.q = p.get("q") || "";
  state.area = regions.some(r => r.id === p.get("area")) ? p.get("area") : "all";
  state.flags = new Set((p.get("need") || "").split(",").filter(f => ["power", "late", "study"].includes(f)));
  state.prices = new Set((p.get("price") || "").split(",").filter(x => ["1", "2", "3"].includes(x)));
  state.sort = ["rating", "reviews", "name"].includes(p.get("sort")) ? p.get("sort") : "rating";
  state.open = byId.has(p.get("cafe")) ? p.get("cafe") : null;
}

function writeHash() {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.area !== "all") p.set("area", state.area);
  if (state.flags.size) p.set("need", [...state.flags].join(","));
  if (state.prices.size) p.set("price", [...state.prices].sort().join(","));
  if (state.sort !== "rating") p.set("sort", state.sort);
  if (state.open) p.set("cafe", state.open);
  const next = p.toString();
  history.replaceState(null, "", next ? "#" + next : location.pathname + location.search);
}

/* --- Filtering ------------------------------------------------------- */

function matches(c) {
  if (state.area !== "all" && c.region !== state.area) return false;
  if (state.flags.has("power") && !(c.power === "plenty" || c.power === "some")) return false;
  if (state.flags.has("late") && !c.late) return false;
  if (state.flags.has("study") && !c.studyCafe) return false;
  if (state.prices.size && !state.prices.has(String(c.price))) return false;
  if (state.q) {
    const hay = [c.name, c.area, c.address, ...c.menu, ...c.notes].join(" ").toLowerCase();
    if (!state.q.toLowerCase().split(/\s+/).every(w => hay.includes(w))) return false;
  }
  return true;
}

function sorted(list) {
  const s = [...list];
  if (state.sort === "name") s.sort((a, b) => a.name.localeCompare(b.name));
  else if (state.sort === "reviews") s.sort((a, b) => b.reviews - a.reviews);
  else s.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  return s;
}

/* --- Map ------------------------------------------------------------- */

const map = L.map("map", { zoomControl: true, scrollWheelZoom: true, attributionControl: false })
  .setView([-36.86, 174.75], 12);

const tiles = {
  light: [
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
  ],
  dark: [
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
  ],
};
let tileLayers = [];

function paintTiles() {
  const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  tileLayers.forEach(l => map.removeLayer(l));
  // Base canvas plus its street-name labels; the canvas tiles stop at zoom 16.
  tileLayers = tiles[theme].map(url => L.tileLayer(url, { maxZoom: 19, maxNativeZoom: 16 }).addTo(map));
}
paintTiles();

const markers = new Map();

// Zoomed out, the city-centre pins pile up, so they shrink to dots until zoom 13.
const paintZoom = () => map.getContainer().classList.toggle("is-far", map.getZoom() < 13);
map.on("zoomend", paintZoom);

function pinIcon(c, active) {
  return L.divIcon({
    className: "pin-wrap",
    html: `<span class="pin${active ? " is-active" : ""}${c.studyCafe ? " pin--study" : ""}">${c.rating.toFixed(1)}</span>`,
    iconSize: [40, 28],
    iconAnchor: [20, 28],
    popupAnchor: [0, -26],
  });
}

function popupHtml(c) {
  return `
    <div class="popup">
      <p class="popup__name">${esc(c.name)}</p>
      <p class="popup__addr">${esc(c.address)}</p>
      <p class="popup__meta">
        <span class="stars" aria-hidden="true">★</span> ${c.rating.toFixed(1)}
        <span class="popup__faint">(${c.reviews.toLocaleString()} Google reviews)</span>
        · ${"$".repeat(c.price)}
      </p>
      <p class="popup__power popup__power--${c.power}">${POWER[c.power]}</p>
      <button class="popup__more" type="button" data-open="${c.id}">Read the notes ↓</button>
    </div>`;
}

for (const c of cafes) {
  const m = L.marker([c.lat, c.lng], { icon: pinIcon(c, false), title: c.name, riseOnHover: true })
    .bindPopup(popupHtml(c), { maxWidth: 260, closeButton: true });
  m.on("click", () => openCafe(c.id, { fromMap: true }));
  markers.set(c.id, m);
}

map.on("popupopen", e => {
  const btn = e.popup.getElement().querySelector(".popup__more");
  btn?.addEventListener("click", () => {
    const el = document.getElementById("cafe-" + btn.dataset.open);
    el?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    el?.querySelector(".cafe__toggle")?.focus({ preventScroll: true });
  });
});

/* --- List ------------------------------------------------------------ */

function cafeHtml(c, n) {
  const open = state.open === c.id;
  const gmaps = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(c.name + " " + c.address);
  return `
  <li class="cafe${open ? " is-open" : ""}" id="cafe-${c.id}">
    <button class="cafe__toggle" type="button" aria-expanded="${open}" aria-controls="detail-${c.id}" data-id="${c.id}">
      <span class="cafe__num">${n}</span>
      <span class="cafe__head">
        <span class="cafe__name">${esc(c.name)}</span>
        <span class="cafe__addr">${esc(c.address)}</span>
      </span>
      <span class="cafe__score">
        <span class="cafe__rating"><span class="stars" aria-hidden="true">★</span> ${c.rating.toFixed(1)}</span>
        <span class="cafe__price" aria-label="Price ${c.price} of 3">${"$".repeat(c.price)}</span>
      </span>
      <span class="cafe__tags">
        <span class="tag tag--power-${c.power}">${POWER[c.power]}</span>
        ${c.late ? `<span class="tag tag--late">Open late</span>` : ""}
        ${c.studyCafe ? `<span class="tag tag--study">Study cafe</span>` : ""}
      </span>
    </button>

    <div class="cafe__detail" id="detail-${c.id}" ${open ? "" : "hidden"}>
      <dl class="facts">
        <div><dt>Rating</dt><dd>${c.rating.toFixed(1)} on Google from ${c.reviews.toLocaleString()} reviews</dd></div>
        <div><dt>Hours</dt><dd>${esc(c.hours)}</dd></div>
      </dl>
      <ul class="bullets">
        <li><span class="bullets__k">Size and seating</span> ${esc(c.size)}</li>
        <li><span class="bullets__k">Power</span> ${POWER[c.power]}</li>
        <li><span class="bullets__k">Wifi</span> ${esc(c.wifi)}</li>
        <li><span class="bullets__k">Noise</span> ${esc(c.noise)}</li>
        <li><span class="bullets__k">Price</span> ${"$".repeat(c.price)} <span class="faint">(${esc(c.priceBand)} per person on Google)</span></li>
        <li><span class="bullets__k">On the menu</span>
          <ul>${c.menu.map(m => `<li>${esc(m)}</li>`).join("")}</ul>
        </li>
        ${c.notes.length ? `<li><span class="bullets__k">Good to know</span>
          <ul>${c.notes.map(m => `<li>${esc(m)}</li>`).join("")}</ul>
        </li>` : ""}
      </ul>
      <p class="sources">
        <span>Found via</span>
        ${c.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join(", ")}
        · <a href="${gmaps}" target="_blank" rel="noopener">Open in Google Maps</a>
      </p>
    </div>
  </li>`;
}

let visible = [];

function render({ fit = false } = {}) {
  visible = sorted(cafes.filter(matches));
  if (state.open && !visible.some(c => c.id === state.open)) state.open = null;

  $("#cafes").innerHTML = visible.map((c, i) => cafeHtml(c, i + 1)).join("");
  $("#empty").hidden = visible.length > 0;
  $("#count").textContent = visible.length === cafes.length
    ? `All ${cafes.length} cafes`
    : `${visible.length} of ${cafes.length} cafes`;

  const shown = new Set(visible.map(c => c.id));
  for (const [id, m] of markers) {
    if (shown.has(id)) { if (!map.hasLayer(m)) m.addTo(map); }
    else if (map.hasLayer(m)) map.removeLayer(m);
    m.setIcon(pinIcon(byId.get(id), id === state.open));
    m.setZIndexOffset(id === state.open ? 1000 : 0);
  }

  if (fit && visible.length) {
    map.fitBounds(L.latLngBounds(visible.map(c => [c.lat, c.lng])), { padding: [36, 36], maxZoom: 15 });
  }

  syncControls();
  writeHash();
}

function openCafe(id, { fromMap = false } = {}) {
  state.open = state.open === id && !fromMap ? null : id;
  render();
  if (!state.open) { map.closePopup(); return; }
  const c = byId.get(id);
  const m = markers.get(id);
  if (!fromMap) {
    map.flyTo([c.lat, c.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
    m.openPopup();
  } else {
    const el = document.getElementById("cafe-" + id);
    // Only scroll the list for side-by-side layouts; on phones the map sits above.
    if (el && matchMedia("(min-width: 60rem)").matches) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

/* --- Controls -------------------------------------------------------- */

const areaChips = $("#area-chips");
areaChips.innerHTML = [{ id: "all", label: "All of Auckland" }, ...regions]
  .map(r => `<button class="chip" type="button" data-area="${r.id}" aria-pressed="false">${esc(r.label)}</button>`)
  .join("");

function syncControls() {
  document.querySelectorAll("[data-area]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.area === state.area)));
  document.querySelectorAll("[data-flag]").forEach(b => b.setAttribute("aria-pressed", String(state.flags.has(b.dataset.flag))));
  document.querySelectorAll("[data-price]").forEach(b => b.setAttribute("aria-pressed", String(state.prices.has(b.dataset.price))));
  if ($("#search").value !== state.q) $("#search").value = state.q;
  $("#sort").value = state.sort;
}

document.addEventListener("click", e => {
  const area = e.target.closest("[data-area]");
  if (area) { state.area = area.dataset.area; state.open = null; render({ fit: true }); return; }

  const flag = e.target.closest("[data-flag]");
  if (flag) {
    const f = flag.dataset.flag;
    state.flags.has(f) ? state.flags.delete(f) : state.flags.add(f);
    render({ fit: true });
    return;
  }

  const price = e.target.closest("[data-price]");
  if (price) {
    const p = price.dataset.price;
    state.prices.has(p) ? state.prices.delete(p) : state.prices.add(p);
    render({ fit: true });
    return;
  }

  const toggle = e.target.closest(".cafe__toggle");
  if (toggle) openCafe(toggle.dataset.id);
});

let searchTimer;
$("#search").addEventListener("input", e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { state.q = e.target.value.trim(); render({ fit: true }); }, 140);
});

$("#sort").addEventListener("change", e => { state.sort = e.target.value; render(); });

/* --- Entrance -------------------------------------------------------- */

const revealables = document.querySelectorAll(".reveal");
if (!("IntersectionObserver" in window)) {
  revealables.forEach(el => el.classList.add("is-in"));
} else {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      io.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });
  revealables.forEach(el => io.observe(el));
}

/* --- Theme ----------------------------------------------------------- */

const root = document.documentElement;
const themeToggle = document.getElementById("theme-toggle");

function paint(theme) {
  root.setAttribute("data-theme", theme);
  themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  paintTiles();
}

paint(root.getAttribute("data-theme") === "dark" ? "dark" : "light");

themeToggle.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  paint(next);
  try { localStorage.setItem("theme", next); } catch { /* no-op */ }
});

/* --- Go -------------------------------------------------------------- */

readHash();
render({ fit: !state.open });
paintZoom();
if (state.open) {
  const c = byId.get(state.open);
  map.setView([c.lat, c.lng], 15);
  markers.get(state.open).openPopup();
}

// The map sits in a column that changes size as the layout settles.
setTimeout(() => map.invalidateSize(), 300);
