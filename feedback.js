/* Gracefully feedback: a small microphone button on every page of every app.
   Say (or type) what you think; it's sent with the app and the screen you're
   on, and lands in the feedback table on the party server's database.

   Apps can describe their current screen more precisely by setting
   window.gracefullyScreen = () => "the draft, card 4". Otherwise the page
   title, the main heading and the address are used. */

(() => {
  "use strict";
  if (window.__gracefullyFeedback) return;
  window.__gracefullyFeedback = true;

  const SERVER = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? "http://localhost:8080"
    : "https://party-server-production-d0f7.up.railway.app";
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;

  const css = `
    .gfb-button {
      position: fixed; left: var(--space-sm, 1rem); bottom: var(--space-sm, 1rem); z-index: 40;
      width: 2.5rem; height: 2.5rem; display: grid; place-items: center;
      border: 1.5px solid var(--rule, #ddd2bd); border-radius: 46% 54% 52% 48%;
      background: var(--paper, #fbf7ef); color: var(--ink-muted, #6b6257); cursor: pointer;
      transition: color .2s, border-color .2s, transform .25s cubic-bezier(.34,1.56,.64,1);
    }
    .gfb-button:hover, .gfb-button:focus-visible { color: var(--accent, #2b7d58); border-color: var(--accent, #2b7d58); transform: rotate(-10deg) scale(1.08); outline: none; }
    .gfb-button svg { width: 1.1rem; height: 1.1rem; display: block; }
    .gfb-panel {
      position: fixed; left: var(--space-sm, 1rem); bottom: calc(var(--space-sm, 1rem) + 3.1rem); z-index: 41;
      width: min(22rem, calc(100vw - 2rem)); padding: 1rem 1.1rem 1.1rem;
      background: var(--paper-warm, #f5eee0); color: var(--ink, #241f1a);
      border-radius: var(--radius-blob, 18px 22px 16px 24px);
      box-shadow: 0 12px 30px rgba(36, 31, 26, .18);
      font-family: var(--font-text, "Newsreader", Georgia, serif); font-size: 1rem; line-height: 1.4;
      animation: gfb-in .25s ease-out;
    }
    .gfb-panel[hidden] { display: none; }
    .gfb-title { margin: 0 0 .15rem; font-family: var(--font-hand, "Caveat", cursive); font-size: var(--size-hand, 1.375rem); }
    .gfb-note { margin: 0 0 .6rem; color: var(--ink-muted, #6b6257); font-style: italic; font-size: .92rem; }
    .gfb-text {
      width: 100%; box-sizing: border-box; min-height: 5.5rem; resize: vertical; padding: .55rem .65rem;
      font: inherit; color: inherit; background: var(--paper, #fbf7ef);
      border: 1.5px solid var(--rule, #ddd2bd); border-radius: 12px 14px 10px 16px;
    }
    .gfb-text:focus-visible { outline: 2px solid var(--accent, #2b7d58); outline-offset: 2px; }
    .gfb-row { display: flex; gap: .5rem; align-items: center; margin-top: .6rem; flex-wrap: wrap; }
    .gfb-btn {
      font: inherit; font-size: .95rem; padding: .4rem .85rem; cursor: pointer; color: var(--ink, #241f1a);
      background: var(--paper, #fbf7ef); border: 1.5px solid var(--rule, #ddd2bd); border-radius: 999px;
    }
    .gfb-btn:hover, .gfb-btn:focus-visible { border-color: var(--accent, #2b7d58); outline: none; }
    .gfb-btn--go { background: var(--ink, #241f1a); color: var(--paper, #fbf7ef); border-color: var(--ink, #241f1a); }
    .gfb-btn--go:hover, .gfb-btn--go:focus-visible { background: var(--accent, #2b7d58); border-color: var(--accent, #2b7d58); }
    .gfb-btn[aria-pressed="true"] { color: #c0392b; border-color: #c0392b; }
    .gfb-btn[aria-pressed="true"]::before { content: "● "; }
    .gfb-status { margin: .5rem 0 0; color: var(--ink-muted, #6b6257); font-size: .9rem; min-height: 1.2em; }
    .gfb-close { position: absolute; top: .45rem; right: .6rem; background: none; border: 0; font-size: 1.3rem; line-height: 1; color: var(--ink-muted, #6b6257); cursor: pointer; }
    @keyframes gfb-in { from { opacity: 0; transform: translateY(6px); } }
    @media (prefers-reduced-motion: reduce) { .gfb-panel { animation: none; } .gfb-button { transition: none; } }
    @media print { .gfb-button, .gfb-panel { display: none; } }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "gfb-button";
  button.setAttribute("aria-label", "Give feedback");
  button.title = "Give feedback";
  button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" /></svg>`;

  const panel = document.createElement("div");
  panel.className = "gfb-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Feedback");
  panel.innerHTML = `
    <button class="gfb-close" type="button" aria-label="Close">×</button>
    <p class="gfb-title">Tell Grace what you think</p>
    <p class="gfb-note">${Speech ? "Talk or type: what's great, what's broken, what you wish it did." : "Type what's great, what's broken, or what you wish it did."}</p>
    <textarea class="gfb-text" maxlength="4000" aria-label="Your feedback"></textarea>
    <div class="gfb-row">
      ${Speech ? `<button class="gfb-btn gfb-mic" type="button" aria-pressed="false">Speak</button>` : ""}
      <button class="gfb-btn gfb-btn--go gfb-send" type="button">Send</button>
    </div>
    <p class="gfb-status" aria-live="polite"></p>`;

  const text = panel.querySelector(".gfb-text"), status = panel.querySelector(".gfb-status");
  const mic = panel.querySelector(".gfb-mic"), send = panel.querySelector(".gfb-send");
  let usedVoice = false;

  function mount() {
    if (!document.body) return;
    document.body.appendChild(button);
    document.body.appendChild(panel);
  }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);

  function open() {
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    status.textContent = "";
    text.focus();
  }
  function close() {
    stopListening();
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
    button.focus();
  }
  button.addEventListener("click", () => (panel.hidden ? open() : close()));
  panel.querySelector(".gfb-close").addEventListener("click", close);
  panel.addEventListener("keydown", e => { if (e.key === "Escape") close(); });

  // Speaking: the browser transcribes as you talk, into the box, where it can be corrected.
  let rec = null, base = "";
  function stopListening() {
    if (rec) { try { rec.stop(); } catch { /* already stopped */ } }
  }
  if (mic) mic.addEventListener("click", () => {
    if (rec) return stopListening();
    rec = new Speech();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = document.documentElement.lang || navigator.language || "en";
    base = text.value ? text.value.replace(/\s*$/, " ") : "";
    rec.onresult = e => {
      let said = "";
      for (let i = 0; i < e.results.length; i++) said += e.results[i][0].transcript;
      text.value = base + said;
      usedVoice = true;
    };
    rec.onerror = e => { status.textContent = e.error === "not-allowed" ? "The microphone is blocked; you can type instead." : "Couldn't hear that; try again or type."; };
    rec.onend = () => { rec = null; mic.setAttribute("aria-pressed", "false"); mic.textContent = "Speak"; };
    try {
      rec.start();
      mic.setAttribute("aria-pressed", "true"); mic.textContent = "Listening… tap to stop";
      status.textContent = "";
    } catch { rec = null; }
  });

  // Which app and which screen, so the feedback can be acted on.
  function where() {
    const app = document.documentElement.dataset.app
      || (location.pathname.split("/").filter(Boolean)[0] || "home");
    let screen = "";
    try { screen = typeof window.gracefullyScreen === "function" ? String(window.gracefullyScreen() || "") : ""; } catch { /* the app's own description failed */ }
    if (!screen) {
      const h = [...document.querySelectorAll("h1, h2")].find(el => el.offsetParent !== null);
      screen = [document.title, h && h.textContent.trim()].filter(Boolean).join(" · ");
    }
    return { app, screen: screen.slice(0, 300), url: location.href.slice(0, 500), viewport: `${innerWidth}x${innerHeight}` };
  }

  send.addEventListener("click", async () => {
    stopListening();
    const body = text.value.trim();
    if (body.length < 2) { status.textContent = "Say or type something first."; text.focus(); return; }
    send.disabled = true;
    status.textContent = "Sending…";
    try {
      const res = await fetch(`${SERVER}/feedback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...where(), text: body, how: usedVoice ? "voice" : "typed" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send that.");
      text.value = ""; usedVoice = false;
      status.textContent = "Thank you! Grace will see this.";
      setTimeout(() => { if (!panel.hidden && !text.value) close(); }, 2200);
    } catch (err) {
      status.textContent = `${err.message} Your words are still here; try again in a moment.`;
    } finally {
      send.disabled = false;
    }
  });
})();
