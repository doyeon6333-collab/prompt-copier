/* 세움터 2기 수업 자료실 — app.js */
(function () {
  "use strict";

  var rows = Array.prototype.slice.call(document.querySelectorAll(".row"));
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var q = document.getElementById("q");
  var qClear = document.getElementById("q-clear");
  var qStatus = document.getElementById("q-status");
  var emptyState = document.getElementById("empty");

  /* ---------- tabs: filter rows ---------- */
  function setTab(key) {
    tabs.forEach(function (t) {
      t.setAttribute("aria-pressed", String(t.dataset.target === key));
    });
    rows.forEach(function (r) {
      r.hidden = key !== "all" && r.dataset.key !== key;
    });
    rows.forEach(function (r) { if (!r.hidden) r.classList.toggle("row--single", key !== "all"); });
    applySearch();
    var top = document.getElementById("nav").getBoundingClientRect();
    var y = window.pageYOffset + top.top - 2;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () { setTab(t.dataset.target); });
  });

  /* ---------- search ---------- */
  var cards = Array.prototype.slice.call(document.querySelectorAll(".card, .shot"));
  cards.forEach(function (c) {
    c._hay = ((c.dataset.search || "") + " " + c.textContent).toLowerCase().replace(/\s+/g, " ");
  });

  function applySearch() {
    var term = (q.value || "").trim().toLowerCase();
    var shown = 0;

    cards.forEach(function (card) {
      var row = card.closest(".row");
      if (row && row.hidden) { card.hidden = false; return; }
      var hit = !term || card._hay.indexOf(term) !== -1;
      card.hidden = !hit;
      if (hit) shown++;
    });

    // collapse empty capture groups
    Array.prototype.forEach.call(document.querySelectorAll(".capgroup"), function (g) {
      var any = Array.prototype.some.call(g.querySelectorAll(".shot"), function (s) { return !s.hidden; });
      g.hidden = !any;
      if (g.hidden) return;
      // hide a whole row when a search leaves nothing visible in it
    });

    // row visibility during search
    rows.forEach(function (row) {
      if (row.dataset.tabHidden === "1") return;
      var hasCard = Array.prototype.some.call(row.querySelectorAll(".card, .shot"), function (c) { return !c.hidden; });
      row.classList.toggle("row--empty-by-search", !!term && !hasCard);
      row.style.display = !!term && !hasCard ? "none" : "";
    });

    qClear.hidden = !term;
    if (term) {
      qStatus.hidden = false;
      qStatus.innerHTML = shown
        ? "‘<strong>" + escapeHtml(q.value.trim()) + "</strong>’ 검색 결과 <strong>" + shown + "</strong>개"
        : "‘<strong>" + escapeHtml(q.value.trim()) + "</strong>’에 맞는 자료가 없습니다.";
    } else {
      qStatus.hidden = true;
      qStatus.textContent = "";
    }
    emptyState.hidden = !(term && shown === 0);
    measure();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var qTimer = null;
  q.addEventListener("input", function () {
    clearTimeout(qTimer);
    qTimer = setTimeout(applySearch, 90);
  });
  qClear.addEventListener("click", function () {
    q.value = "";
    q.focus();
    applySearch();
  });

  /* ---------- prompt cards: expand / collapse ---------- */
  function measure() {
    Array.prototype.forEach.call(document.querySelectorAll(".pbody"), function (body) {
      var btn = body.parentElement.querySelector(".toggle");
      if (body.classList.contains("is-open")) {
        body.classList.remove("is-fits");
        if (btn) btn.hidden = false;
        return;
      }
      // hidden row/card: keep the last measured state
      if (body.clientHeight <= 0) return;
      var fits = body.scrollHeight <= body.clientHeight + 6;
      body.classList.toggle("is-fits", fits);
      if (btn) btn.hidden = fits;
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll(".pbody"), function (body) {
    var card = body.closest(".card");
    var btn = card.querySelector(".toggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var open = body.classList.toggle("is-open");
      btn.textContent = open ? "접기" : "전체 보기";
      btn.setAttribute("aria-expanded", String(open));
      if (!open) {
        body.closest(".card").scrollIntoView({ block: "nearest", behavior: "smooth" });
        measure();
      }
    });
  });

  /* ---------- copy ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-copy]"), function (btn) {
    btn.addEventListener("click", function () {
      var card = btn.closest(".card");
      var body = card.querySelector(".pbody");
      var text = body ? body.textContent.replace(/^\n+/, "").replace(/\s+$/, "") : "";
      copyText(text).then(function (ok) {
        btn.textContent = ok ? "복사됨!" : "복사 실패";
        btn.classList.toggle("is-done", ok);
        if (ok) {
          var old = btn.getAttribute("aria-label");
          btn.setAttribute("aria-live", "polite");
        }
        clearTimeout(btn._t);
        btn._t = setTimeout(function () {
          btn.textContent = btn.dataset.label || "복사";
          btn.classList.remove("is-done");
        }, 1800);
      });
    });
  });

  /* ---------- lightbox ---------- */
  var shots = Array.prototype.slice.call(document.querySelectorAll(".shot"));
  var lb = document.getElementById("lb");
  var lbImg = document.getElementById("lb-img");
  var lbCap = document.getElementById("lb-cap");
  var lbI = document.getElementById("lb-i");
  var lbN = document.getElementById("lb-n");
  var lbDl = document.getElementById("lb-dl");
  var current = 0;
  var lastFocus = null;

  lbN.textContent = String(shots.length);

  function openLightbox(i) {
    current = (i + shots.length) % shots.length;
    var shot = shots[current];
    var img = shot.querySelector("img");
    var dl = shot.querySelector(".shot-dl");
    var caption = shot.querySelector(".shot-name").textContent;
    var no = shot.querySelector(".shot-no").textContent;
    lbImg.src = img.getAttribute("src");
    lbImg.alt = img.getAttribute("alt") || caption;
    lbCap.textContent = no + " · " + caption;
    lbDl.href = dl.getAttribute("href");
    lbDl.setAttribute("download", dl.getAttribute("download") || "");
    lbI.textContent = String(current + 1);
    if (lb.hidden) {
      lastFocus = document.activeElement;
      lb.hidden = false;
      document.body.classList.add("lb-open");
    }
    document.getElementById("lb-close").focus();
  }

  function closeLightbox() {
    lb.hidden = true;
    document.body.classList.remove("lb-open");
    lbImg.src = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  shots.forEach(function (shot, i) {
    var btn = shot.querySelector(".shot-btn");
    btn.addEventListener("click", function () { openLightbox(i); });
  });

  document.getElementById("lb-close").addEventListener("click", closeLightbox);
  document.getElementById("lb-prev").addEventListener("click", function () { openLightbox(current - 1); });
  document.getElementById("lb-next").addEventListener("click", function () { openLightbox(current + 1); });
  lb.addEventListener("click", function (e) {
    if (e.target === lb || e.target.classList.contains("lb-center")) closeLightbox();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && q.value) { q.value = ""; applySearch(); return; }
    if (lb.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); closeLightbox(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); openLightbox(current - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); openLightbox(current + 1); }
  });

  /* ---------- init ---------- */
  window.addEventListener("load", measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  var mTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(mTimer);
    mTimer = setTimeout(measure, 160);
  });
  document.querySelectorAll("[data-copy]").forEach(function (b) { b.dataset.label = b.textContent; });
  measure();
})();
