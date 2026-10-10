/* The connection to the party server, shared by the TV and the phones.
   Reconnects on its own: phones sleep, Wi-Fi drops, and a party shouldn't
   end because someone's screen locked. */

(function () {
  "use strict";

  const SERVER = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? "ws://localhost:8080"
    : "wss://party-server-production-d0f7.up.railway.app";

  function connect({ onOpen, onMessage, onStatus }) {
    let ws = null;
    let tries = 0;
    let closedOnPurpose = false;
    const queue = [];

    function open() {
      onStatus && onStatus(tries ? "reconnecting" : "connecting");
      ws = new WebSocket(SERVER);
      ws.onopen = () => {
        tries = 0;
        onStatus && onStatus("open");
        onOpen && onOpen();
        while (queue.length) ws.send(queue.shift());
      };
      ws.onmessage = e => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }
        onMessage(msg);
      };
      ws.onclose = () => {
        if (closedOnPurpose) return;
        onStatus && onStatus("reconnecting");
        tries += 1;
        setTimeout(open, Math.min(8000, 400 * 2 ** Math.min(tries, 5)));
      };
      ws.onerror = () => { try { ws.close(); } catch { /* no-op */ } };
    }

    // Coming back to a backgrounded tab: reconnect straight away.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && ws && ws.readyState > 1) { tries = 0; open(); }
    });

    open();
    return {
      send(obj) {
        const s = JSON.stringify(obj);
        if (ws && ws.readyState === 1) ws.send(s); else queue.push(s);
      },
      close() { closedOnPurpose = true; try { ws.close(); } catch { /* no-op */ } },
    };
  }

  // Server time, so countdowns agree across screens whatever the clocks say.
  let skew = 0;
  const clock = {
    sync(serverNow) { if (serverNow) skew = serverNow - Date.now(); },
    left(endsAt) { return Math.max(0, Math.ceil((endsAt - (Date.now() + skew)) / 1000)); },
  };

  const safe = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* no-op */ } },
    remove(k) { try { localStorage.removeItem(k); } catch { /* no-op */ } },
  };

  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // A card's picture: one image, or an animal with its weapon as a badge.
  function picture(card, cls) {
    if (!card) return "";
    const [src, badge] = Array.isArray(card.image) ? card.image : [card.image];
    const letters = esc(String(card.name).split(" ").slice(0, 2).map(w => w[0]).join(""));
    return `<span class="pic ${cls || ""}"><span class="pic__letters" aria-hidden="true">${letters}</span>${src
      ? `<img src="${esc(src)}" alt="" referrerpolicy="origin" onerror="this.remove()" />` : ""}${badge
      ? `<span class="pic__badge"><img src="${esc(badge)}" alt="" referrerpolicy="origin" onerror="this.parentNode.remove()" /></span>` : ""}</span>`;
  }

  /* Fit to the screen: shrink the root font size (everything is sized in
     rem) until the page needs no scrolling, but never below a readable
     minimum. Re-runs on resize and as pictures finish loading. */
  function fitter(base, min) {
    const root = document.documentElement;
    let queued = false;
    const fits = () => root.scrollHeight <= window.innerHeight + 1;
    function run() {
      queued = false;
      let hi = base(), lo = min;
      root.style.fontSize = `${hi}px`;
      if (fits()) return;
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        root.style.fontSize = `${mid}px`;
        if (fits()) lo = mid; else hi = mid;
      }
      root.style.fontSize = `${lo}px`;
    }
    const soon = () => { if (!queued) { queued = true; setTimeout(run, 30); } };
    window.addEventListener("resize", soon);
    document.addEventListener("load", e => { if (e.target.tagName === "IMG") soon(); }, true);
    return soon;
  }

  window.Party = { connect, clock, safe, esc, picture, fitter, SERVER };
})();
