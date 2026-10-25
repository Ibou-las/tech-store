/* =========================================================
   TECH STORE — EFFECTS.JS (v2)
   Animations + navigation : recherche plein écran, panier latéral,
   barre mobile, héros animé, compteurs, effet "vol vers le panier".
   Chargé APRÈS cart.js et main.js sur chaque page.
   ========================================================= */

(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isSmall = window.matchMedia("(max-width: 900px)").matches;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const page = () => location.pathname.split("/").pop() || "index.html";

  // Quand une fenêtre (recherche, panier) est ouverte, le reste de la page n'est plus atteignable
  const BACKGROUND = ".announce, .site-header, main, .site-footer, .bottom-nav, .whatsapp-float, .back-top";
  const setBackgroundInert = (on) => $$(BACKGROUND).forEach((el) => (el.inert = on));

  function trapFocus(container, e) {
    if (e.key !== "Tab") return;
    const f = $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', container).filter(
      (el) => el.offsetParent !== null && el.tabIndex >= 0
    );
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  const ICONS = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V11Z"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 6-6 6 6"/></svg>',
    palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-1.8 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14.5" cy="7" r="1"/></svg>',
  };

  /* ---------------------------------------------------------
     1. Barre d'annonces défilante
     --------------------------------------------------------- */
  function announcementBar() {
    const items = [
      "📦 Modalités de livraison confirmées avant commande",
      "💬 Commande et confirmation sur WhatsApp",
      "🛍️ Disponibilité vérifiée avant validation",
      "💳 Paiement après confirmation de la commande",
    ];
    const set = items.map((t) => `<span>${t}</span>`).join("");
    const bar = document.createElement("div");
    bar.className = "announce";
    bar.innerHTML = `<div class="announce-track">${set}<span aria-hidden="true" style="display:contents">${set}</span></div>`;
    document.body.prepend(bar);
  }

  /* ---------------------------------------------------------
     2. Progression du scroll, header intelligent, retour en haut
     --------------------------------------------------------- */
  function scrollEffects() {
    const bar = document.createElement("div");
    bar.className = "scroll-progress";
    document.body.appendChild(bar);

    const top = document.createElement("button");
    top.type = "button";
    top.className = "back-top";
    top.setAttribute("aria-label", "Retour en haut");
    top.innerHTML = ICONS.up;
    top.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));
    document.body.appendChild(top);

    const header = $(".site-header");
    const root = document.documentElement;
    let lastY = window.scrollY;
    let ticking = false;

    const showHeader = () => {
      if (!header) return;
      header.classList.remove("header-hidden");
      root.style.removeProperty("--sticky-top");
    };

    header && header.addEventListener("focusin", showHeader);

    function update() {
      ticking = false;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      top.classList.toggle("show", y > 700);

      if (!header) return;
      const dy = y - lastY;
      if (Math.abs(dy) > 6) {
        if (dy > 0 && y > 160 && !$(".main-nav.open")) {
          header.classList.add("header-hidden");
          root.style.setProperty("--sticky-top", "0px");
        } else if (dy < 0) {
          showHeader();
        }
        lastY = y;
      }
      if (y < 80) showHeader();
    }

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  }

  /* ---------------------------------------------------------
     3. Menu mobile : fermeture au clic extérieur / Échap,
        et "Boutique" actif sur la fiche produit
     --------------------------------------------------------- */
  function navPolish() {
    if (page() === "product.html") {
      $$(".main-nav .nav-link").forEach((l) => l.classList.toggle("active", l.getAttribute("href") === "shop.html"));
    }
    const btn = $(".mobile-menu-button");
    const nav = $(".main-nav");
    if (!btn || !nav) return;
    const close = () => {
      btn.classList.remove("active");
      nav.classList.remove("open");
    };
    document.addEventListener("click", (e) => {
      if (nav.classList.contains("open") && !e.target.closest(".main-nav, .mobile-menu-button")) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }


  /* ---------------------------------------------------------
     3b. Choix du style du site (Nuit / Sahel / Pop)
     --------------------------------------------------------- */
  const THEMES = [
    { key: "nuit", name: "Nuit", desc: "Sombre et électrique" },
    { key: "sahel", name: "Sahel", desc: "Clair et chaleureux" },
    { key: "pop", name: "Pop", desc: "Audacieux et coloré" },
  ];
  const THEME_COLORS = { nuit: "#0a0912", sahel: "#f7f0e3", pop: "#ffd400" };
  const currentTheme = () => document.documentElement.getAttribute("data-theme") || "nuit";

  function applyTheme(t, persist) {
    if (!THEME_COLORS[t]) return;
    const root = document.documentElement;
    if (!reduceMotion) {
      root.classList.add("theme-anim");
      clearTimeout(applyTheme.timer);
      applyTheme.timer = setTimeout(() => root.classList.remove("theme-anim"), 450);
    }
    root.setAttribute("data-theme", t);
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[t]);
    if (persist) {
      try { localStorage.setItem("techstore_theme", t); } catch (e) { /* stockage bloqué : le choix vaut pour cette page */ }
    }
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: t } }));
  }

  function themeSwitcher() {
    const actions = $(".header-actions");
    let toggle = null;
    if (actions) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "header-action theme-toggle";
      toggle.setAttribute("data-open-theme", "");
      toggle.setAttribute("aria-haspopup", "dialog");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Changer le style du site");
      toggle.title = "Changer le style du site";
      toggle.innerHTML = `${ICONS.palette}<span class="theme-toggle-label">Style</span>`;
      actions.insertBefore(toggle, $('a[href="cart.html"]', actions));
      let seen = false;
      try { seen = !!localStorage.getItem("techstore_theme_seen"); } catch (e) {}
      if (!seen) toggle.classList.add("pulse");
    }

    const menu = document.createElement("div");
    menu.className = "theme-menu";
    menu.id = "themeMenu";
    menu.setAttribute("role", "dialog");
    menu.setAttribute("aria-label", "Choisir le style du site");
    menu.innerHTML = `
      <div class="theme-menu-head">
        <div class="theme-menu-title" id="themeMenuTitle">Style du site</div>
        <button type="button" class="theme-menu-close" aria-label="Fermer">✕</button>
      </div>
      <div role="radiogroup" aria-labelledby="themeMenuTitle">
        ${THEMES.map((t) => `
          <button type="button" class="theme-option" role="radio" aria-checked="false" tabindex="-1" data-theme-choice="${t.key}">
            <span class="swatch swatch-${t.key}" aria-hidden="true"></span>
            <span class="tm-text"><strong>${t.name}</strong><small>${t.desc}</small></span>
            <span class="tm-check" aria-hidden="true">✓</span>
          </button>`).join("")}
      </div>`;
    document.body.appendChild(menu);

    const options = $$(".theme-option", menu);
    let opener = null;

    function sync() {
      const cur = currentTheme();
      options.forEach((o) => {
        const on = o.dataset.themeChoice === cur;
        o.setAttribute("aria-checked", String(on));
        o.tabIndex = on ? 0 : -1;
      });
    }

    function place(anchor) {
      if (window.matchMedia("(max-width: 900px)").matches || !anchor) {
        menu.style.top = menu.style.right = menu.style.left = "";
        return;
      }
      const r = anchor.getBoundingClientRect();
      menu.style.top = r.bottom + 10 + "px";
      menu.style.left = "auto";
      menu.style.right = Math.max(12, window.innerWidth - r.right) + "px";
    }

    function open(anchor) {
      opener = anchor || document.activeElement;
      sync();
      place(anchor);
      menu.classList.add("open");
      toggle && toggle.setAttribute("aria-expanded", "true");
      toggle && toggle.classList.remove("pulse");
      try { localStorage.setItem("techstore_theme_seen", "1"); } catch (e) {}
      setTimeout(() => $('.theme-option[aria-checked="true"]', menu).focus(), 60);
    }

    function close(restoreFocus = true) {
      menu.classList.remove("open");
      toggle && toggle.setAttribute("aria-expanded", "false");
      if (restoreFocus && opener && opener.focus) opener.focus();
    }

    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-open-theme]");
      if (trigger) {
        e.preventDefault();
        menu.classList.contains("open") ? close() : open(trigger);
        return;
      }
      if (menu.classList.contains("open") && !e.target.closest(".theme-menu")) close(false);
    });

    menu.addEventListener("click", (e) => {
      if (e.target.closest(".theme-menu-close")) return close();
      const opt = e.target.closest(".theme-option");
      if (!opt) return;
      applyTheme(opt.dataset.themeChoice, true);
      sync();
    });

    menu.addEventListener("keydown", (e) => {
      if (e.key === "Escape") return close();
      if (e.key === "Tab") return trapFocus(menu, e);
      const i = options.findIndex((o) => o === document.activeElement);
      if (i < 0) return;
      let n = -1;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") n = (i + 1) % options.length;
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") n = (i - 1 + options.length) % options.length;
      if (e.key === "Home") n = 0;
      if (e.key === "End") n = options.length - 1;
      if (n >= 0) {
        e.preventDefault();
        applyTheme(options[n].dataset.themeChoice, true);
        sync();
        options[n].focus();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("open") && !menu.contains(document.activeElement)) close();
    });
    window.addEventListener("resize", () => menu.classList.contains("open") && place(opener));
    window.addEventListener("themechange", sync);
    window.addEventListener("storage", (e) => {
      if (e.key === "techstore_theme" && e.newValue && e.newValue !== currentTheme()) applyTheme(e.newValue, false);
    });
    sync();
  }

  /* ---------------------------------------------------------
     4. Recherche plein écran avec suggestions en direct
     --------------------------------------------------------- */
  function searchOverlay() {
    const actions = $(".header-actions");
    if (actions && !$("[data-open-search]", actions)) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "header-action";
      b.setAttribute("data-open-search", "");
      b.setAttribute("aria-label", "Rechercher");
      b.innerHTML = ICONS.search;
      actions.prepend(b);
    }

    const overlay = document.createElement("div");
    overlay.className = "search-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Rechercher un produit");
    overlay.innerHTML = `
      <div class="search-panel">
        <form class="search-field" role="search">
          ${ICONS.search}
          <input type="search" placeholder="Rechercher un produit…" autocomplete="off" aria-label="Rechercher">
          <button type="button" class="search-close" aria-label="Fermer">Échap</button>
        </form>
        <div class="search-results"></div>
      </div>`;
    document.body.appendChild(overlay);

    const input = $("input", overlay);
    const results = $(".search-results", overlay);
    const form = $("form", overlay);
    let products = [];
    let active = -1;
    let lastFocus = null;

    const catChips = () =>
      (typeof CATEGORIES !== "undefined" ? CATEGORIES : [])
        .map((c) => `<a class="chip" href="shop.html?cat=${esc(c.key)}">${esc(c.label)}</a>`)
        .join("");

    function render(q) {
      q = q.trim().toLowerCase();
      active = -1;
      if (!q) {
        results.innerHTML = `<div class="search-hint">Tape le nom d’un produit ou choisis une catégorie</div><div class="search-cats">${catChips()}</div>`;
        return;
      }
      const list = products
        .filter((p) => `${p.name} ${p.categoryLabel} ${p.description}`.toLowerCase().includes(q))
        .slice(0, 6);
      results.innerHTML = list.length
        ? list
            .map(
              (p) => `
          <a class="search-item" href="product.html?id=${esc(p.id)}">
            <img src="${esc(p.image || placeholderFor(p.category))}" alt="" loading="lazy" data-cat="${esc(p.category)}">
            <div><div class="search-item-name">${esc(p.name)}</div><div class="search-item-meta">${esc(p.categoryLabel)}</div></div>
            <div class="search-item-price">${formatPrice(p.price)}</div>
          </a>`
            )
            .join("") + `<a class="search-all" href="shop.html?q=${encodeURIComponent(q)}">Voir tous les résultats →</a>`
        : `<div class="search-hint">Aucun résultat pour « ${esc(q)} »</div><div class="search-cats">${catChips()}</div>`;
    }

    async function open() {
      lastFocus = document.activeElement;
      overlay.classList.add("open");
      document.body.classList.add("no-scroll");
      setBackgroundInert(true);
      render(input.value);
      setTimeout(() => input.focus(), 60);
      if (!products.length) {
        try {
          products = await loadProducts();
          render(input.value);
        } catch (e) {
          /* catalogue indisponible : la recherche affichera les catégories */
        }
      }
    }

    function close() {
      overlay.classList.remove("open");
      document.body.classList.remove("no-scroll");
      setBackgroundInert(false);
      lastFocus && lastFocus.focus && lastFocus.focus();
    }

    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-open-search]")) {
        e.preventDefault();
        open();
      }
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.closest(".search-close")) close();
    });
    input.addEventListener("input", () => render(input.value));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const items = $$(".search-item", results);
      if (active >= 0 && items[active]) return (location.href = items[active].href);
      const q = input.value.trim();
      location.href = q ? `shop.html?q=${encodeURIComponent(q)}` : "shop.html";
    });

    document.addEventListener("keydown", (e) => {
      const isOpen = overlay.classList.contains("open");
      if (isOpen) trapFocus(overlay, e);
      if (e.key === "Escape" && isOpen) return close();
      if (e.key === "/" && !isOpen && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        open();
      }
      if (isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        const items = $$(".search-item", results);
        if (!items.length) return;
        e.preventDefault();
        active = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items.forEach((it, i) => it.classList.toggle("is-active", i === active));
        items[active].scrollIntoView({ block: "nearest" });
      }
    });
  }

  /* ---------------------------------------------------------
     5. Panier latéral (tiroir)
     --------------------------------------------------------- */
  function cartDrawer() {
    const overlay = document.createElement("div");
    overlay.className = "drawer-overlay";
    const drawer = document.createElement("aside");
    drawer.className = "cart-drawer";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-label", "Mon panier");
    drawer.innerHTML = `
      <div class="drawer-head">
        <h2>Mon panier <small></small></h2>
        <button type="button" class="drawer-close" aria-label="Fermer le panier">✕</button>
      </div>
      <div class="drawer-body"></div>
      <div class="drawer-foot" hidden>
        <div class="drawer-total"><span>Sous-total</span><strong></strong></div>
        <a class="btn btn-primary btn-full" href="checkout.html">Commander</a>
        <a class="btn btn-secondary btn-full" href="cart.html">Voir le panier</a>
      </div>`;
    document.body.append(overlay, drawer);

    const body = $(".drawer-body", drawer);
    const foot = $(".drawer-foot", drawer);
    let lastFocus = null;

    function render() {
      const cart = getCart();
      const count = getCartCount();
      $(".drawer-head small", drawer).textContent = count ? `(${count})` : "";
      if (!cart.length) {
        body.innerHTML = `<div class="drawer-empty"><p>Ton panier est vide.</p><a class="btn btn-primary" href="shop.html">Voir les produits</a></div>`;
        foot.hidden = true;
        return;
      }
      body.innerHTML = cart
        .map(
          (it) => `
        <div class="drawer-item">
          <img src="${esc(it.image || placeholderFor(it.category))}" alt="" data-cat="${esc(it.category || "")}">
          <div>
            <div class="drawer-item-name">${esc(it.name)}</div>
            <div class="drawer-item-price">${formatPrice(it.price)}</div>
            <div class="drawer-item-row">
              <div class="drawer-qty">
                <button type="button" data-act="minus" data-id="${esc(it.id)}" aria-label="Moins">−</button>
                <span>${it.qty}</span>
                <button type="button" data-act="plus" data-id="${esc(it.id)}" aria-label="Plus">+</button>
              </div>
              <button type="button" class="drawer-remove" data-act="remove" data-id="${esc(it.id)}">Retirer</button>
            </div>
          </div>
        </div>`
        )
        .join("");
      $(".drawer-total strong", drawer).textContent = formatPrice(getCartTotal());
      foot.hidden = false;
    }

    function open() {
      lastFocus = document.activeElement;
      render();
      overlay.classList.add("open");
      drawer.classList.add("open");
      document.body.classList.add("no-scroll");
      setBackgroundInert(true);
      setTimeout(() => $(".drawer-close", drawer).focus(), 60);
      // prix / stock à jour avec le catalogue actuel
      typeof syncCartWithCatalog === "function" && syncCartWithCatalog();
    }

    function close() {
      overlay.classList.remove("open");
      drawer.classList.remove("open");
      document.body.classList.remove("no-scroll");
      setBackgroundInert(false);
      lastFocus && lastFocus.focus && lastFocus.focus();
    }

    overlay.addEventListener("click", close);
    $(".drawer-close", drawer).addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (!drawer.classList.contains("open")) return;
      trapFocus(drawer, e);
      if (e.key === "Escape") close();
    });

    drawer.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const id = b.dataset.id;
      const item = getCart().find((i) => i.id === id);
      if (!item) return;
      if (b.dataset.act === "plus") updateCartQty(id, item.qty + 1);
      if (b.dataset.act === "minus") updateCartQty(id, item.qty - 1);
      if (b.dataset.act === "remove") removeFromCart(id);
    });

    // L'icône panier ouvre le tiroir (sauf sur les pages panier / commande)
    document.addEventListener("click", (e) => {
      const trigger = e.target.closest('a[href="cart.html"][data-open-cart], .header-actions a[href="cart.html"]');
      if (!trigger) return;
      if (page() === "cart.html" || page() === "checkout.html") return;
      e.preventDefault();
      open();
    });

    window.addEventListener("cart:updated", () => drawer.classList.contains("open") && render());
    window.addEventListener("storage", (e) => {
      if (e.key === CART_KEY) {
        updateCartBadge();
        drawer.classList.contains("open") && render();
      }
    });
  }

  /* ---------------------------------------------------------
     6. Barre de navigation mobile
     --------------------------------------------------------- */
  function bottomNav() {
    const p = page();
    const on = (...pages) => (pages.includes(p) ? " active" : "");
    const nav = document.createElement("nav");
    nav.className = "bottom-nav";
    nav.setAttribute("aria-label", "Navigation rapide");
    nav.innerHTML = `
      <a class="bn-item${on("index.html")}" href="index.html">${ICONS.home}<span>Accueil</span></a>
      <a class="bn-item${on("shop.html", "product.html")}" href="shop.html">${ICONS.grid}<span>Boutique</span></a>
      <button type="button" class="bn-item" data-open-search>${ICONS.search}<span>Chercher</span></button>
      <button type="button" class="bn-item" data-open-theme aria-haspopup="dialog">${ICONS.palette}<span>Style</span></button>
      <a class="bn-item${on("cart.html", "checkout.html")}" href="cart.html" data-open-cart>
        <span class="bn-icon">${ICONS.cart}<span class="cart-count">0</span></span><span>Panier</span>
      </a>`;
    document.body.appendChild(nav);
  }

  /* ---------------------------------------------------------
     7. Héros : aurore, particules, titre animé, texte tapé, parallaxe
     --------------------------------------------------------- */
  function splitHeroTitle() {
    const title = $(".hero-title");
    if (!title) return;
    let i = 0;
    Array.from(title.childNodes).forEach((node) => {
      if (node.nodeType === 3) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((tok) => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) return frag.appendChild(document.createTextNode(tok));
          const w = document.createElement("i");
          w.className = "w";
          w.style.setProperty("--i", i++);
          w.textContent = tok;
          frag.appendChild(w);
        });
        title.replaceChild(frag, node);
      } else if (node.nodeType === 1 && node.tagName === "SPAN") {
        node.classList.add("w", "grad");
        node.style.setProperty("--i", i++);
      }
    });
    title.classList.add("is-split");
  }

  function typed() {
    $$("[data-typed]").forEach((el) => {
      let words;
      try {
        words = JSON.parse(el.dataset.typed);
      } catch (e) {
        return;
      }
      if (!words || !words.length) return;
      if (reduceMotion) {
        el.textContent = words[0];
        return;
      }
      let wi = 0, ci = 0, del = false;
      (function tick() {
        const w = words[wi];
        ci += del ? -1 : 1;
        el.textContent = w.slice(0, ci);
        let delay = del ? 35 : 80;
        if (!del && ci === w.length) { del = true; delay = 1600; }
        else if (del && ci === 0) { del = false; wi = (wi + 1) % words.length; delay = 400; }
        setTimeout(tick, delay);
      })();
    });
  }

  function heroEffects() {
    const hero = $(".hero");
    if (!hero) return;

    const aurora = document.createElement("div");
    aurora.className = "hero-aurora";
    aurora.setAttribute("aria-hidden", "true");
    aurora.innerHTML = "<i></i><i></i><i></i>";
    hero.prepend(aurora);

    // Parallaxe douce (souris uniquement)
    const visual = $(".hero-visual", hero);
    if (visual && finePointer && !reduceMotion) {
      hero.addEventListener("pointermove", (e) => {
        const r = hero.getBoundingClientRect();
        visual.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        visual.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      });
      hero.addEventListener("pointerleave", () => {
        visual.style.setProperty("--px", 0);
        visual.style.setProperty("--py", 0);
      });
    }

    if (reduceMotion) return;

    // Particules reliées (canvas), en pause quand le héros n'est pas visible
    const canvas = document.createElement("canvas");
    canvas.className = "hero-canvas";
    canvas.setAttribute("aria-hidden", "true");
    aurora.after(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    const cols = ["197,248,42", "139,92,255"];
    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      cols[0] = cs.getPropertyValue("--accent-rgb").trim() || cols[0];
      cols[1] = cs.getPropertyValue("--accent-2-rgb").trim() || cols[1];
    };
    const canvasAllowed = () => currentTheme() === "nuit";
    readColors();
    const COUNT = isSmall ? 24 : 54;
    const LINK = (isSmall ? 105 : 150) * DPR;
    const mouse = { x: -9999, y: -9999 };
    let W = 0, H = 0, pts = [], raf = 0, inView = true;

    const seed = () => {
      pts = Array.from({ length: COUNT }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.28 * DPR,
        vy: (Math.random() - 0.5) * 0.28 * DPR,
        r: (1 + Math.random() * 1.8) * DPR,
        c: Math.random() < 0.65 ? 0 : 1,
      }));
    };

    let lastW = 0, lastH = 0;
    const resize = () => {
      const r = hero.getBoundingClientRect();
      // petit changement de hauteur (barre d'adresse mobile) : on ne réinitialise pas les particules
      if (pts.length && Math.abs(r.width - lastW) < 24 && Math.abs(r.height - lastH) < 120) return;
      lastW = r.width; lastH = r.height;
      W = canvas.width = Math.max(1, Math.round(r.width * DPR));
      H = canvas.height = Math.max(1, Math.round(r.height * DPR));
      seed();
    };

    function step() {
      ctx.clearRect(0, 0, W, H);
      const R2 = (150 * DPR) ** 2;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;

        const mx = mouse.x - p.x, my = mouse.y - p.y, md = mx * mx + my * my;
        if (md < R2) {
          p.vx += mx * 0.00004 * DPR;
          p.vy += my * 0.00004 * DPR;
          ctx.strokeStyle = `rgba(${cols[0]},${(1 - Math.sqrt(md / R2)) * 0.4})`;
          ctx.lineWidth = DPR;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        const sp = Math.hypot(p.vx, p.vy), max = 0.6 * DPR;
        if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }

        ctx.fillStyle = `rgba(${cols[p.c]},.85)`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();

        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            ctx.strokeStyle = `rgba(${cols[0]},${(1 - Math.sqrt(d2) / LINK) * 0.28})`;
            ctx.lineWidth = DPR;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(step);
    }

    const start = () => { if (!raf && inView && !document.hidden && canvasAllowed()) raf = requestAnimationFrame(step); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    resize();
    new ResizeObserver(() => { resize(); }).observe(hero);
    new IntersectionObserver((en) => { inView = en[0].isIntersecting; inView ? start() : stop(); }).observe(hero);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

    if (finePointer) {
      hero.addEventListener("pointermove", (e) => {
        const r = canvas.getBoundingClientRect();
        mouse.x = (e.clientX - r.left) * DPR;
        mouse.y = (e.clientY - r.top) * DPR;
      });
      hero.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });
    }
    window.addEventListener("themechange", () => {
      readColors();
      if (canvasAllowed()) start();
      else { stop(); ctx.clearRect(0, 0, W, H); }
    });
    start();
  }

  /* ---------------------------------------------------------
     8. Compteurs et décompte (date réelle choisie par le vendeur)
     --------------------------------------------------------- */
  function counters() {
    const els = $$("[data-count]");
    if (!els.length) return;

    const run = (el, target) => {
      const prefix = el.dataset.prefix || "", suffix = el.dataset.suffix || "";
      if (reduceMotion) { el.textContent = prefix + target + suffix; return; }
      const t0 = performance.now(), dur = 1400;
      (function f(now) {
        const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(target * e) + suffix;
        if (p < 1) requestAnimationFrame(f);
      })(t0);
    };

    const io = new IntersectionObserver(
      async (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          io.unobserve(en.target);
          let v = en.target.dataset.count;
          if (v === "products") {
            try { v = (await loadProducts()).length; } catch (e) { continue; }
          }
          run(en.target, Number(v) || 0);
        }
      },
      { threshold: 0.4 }
    );
    els.forEach((el) => io.observe(el));
  }

  function countdown() {
    $$("[data-countdown]").forEach((el) => {
      const end = Date.parse(el.dataset.countdown);
      if (!end || end <= Date.now()) { el.hidden = true; return; }
      el.hidden = false;
      const set = (k, v) => { const n = $(`[data-cd="${k}"]`, el); if (n) n.textContent = String(v).padStart(2, "0"); };
      (function tick() {
        const left = end - Date.now();
        if (left <= 0) { el.hidden = true; return; }
        set("d", Math.floor(left / 864e5));
        set("h", Math.floor(left / 36e5) % 24);
        set("m", Math.floor(left / 6e4) % 60);
        set("s", Math.floor(left / 1e3) % 60);
        setTimeout(tick, 1000);
      })();
    });
  }

  /* ---------------------------------------------------------
     9. Interactions : lueur des cartes, ondulation, vol vers le panier
     --------------------------------------------------------- */
  function cardSpotlight() {
    if (!finePointer) return;
    let raf = 0;
    document.addEventListener(
      "pointermove",
      (e) => {
        const card = e.target.closest && e.target.closest(".product-card, .category-card, .feature-card, .testimonial-card");
        if (!card || raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const r = card.getBoundingClientRect();
          card.style.setProperty("--mx", e.clientX - r.left + "px");
          card.style.setProperty("--my", e.clientY - r.top + "px");
        });
      },
      { passive: true }
    );
  }

  function ripples() {
    if (reduceMotion) return;
    document.addEventListener("pointerdown", (e) => {
      const btn = e.target.closest && e.target.closest(".btn");
      if (!btn) return;
      const r = btn.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2;
      const s = document.createElement("span");
      s.className = "ripple";
      s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      btn.appendChild(s);
      setTimeout(() => s.remove(), 650);
    });
  }

  function flyToCart() {
    window.addEventListener("cart:fly", (e) => {
      if (reduceMotion) return;
      const img = e.detail && e.detail.image;
      if (!img || !img.getBoundingClientRect) return;
      const target = $$(".bottom-nav .bn-icon, .header-actions a[href='cart.html']").find((t) => {
        const r = t.getBoundingClientRect();
        return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
      });
      if (!target) return;

      const a = img.getBoundingClientRect(), b = target.getBoundingClientRect();
      const clone = img.cloneNode();
      clone.removeAttribute("loading");
      Object.assign(clone.style, {
        position: "fixed", left: a.left + "px", top: a.top + "px",
        width: a.width + "px", height: a.height + "px", objectFit: "contain",
        zIndex: 3200, pointerEvents: "none", borderRadius: "16px", background: "#07111d",
      });
      document.body.appendChild(clone);

      const dx = b.left + b.width / 2 - (a.left + a.width / 2);
      const dy = b.top + b.height / 2 - (a.top + a.height / 2);
      const anim = clone.animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 1 },
          { transform: `translate(${dx * 0.55}px,${dy * 0.3 - 70}px) scale(.5)`, opacity: 0.95, offset: 0.55 },
          { transform: `translate(${dx}px,${dy}px) scale(.08)`, opacity: 0.2 },
        ],
        { duration: 750, easing: "cubic-bezier(.5,0,.8,.4)" }
      );
      anim.onfinish = () => {
        clone.remove();
        typeof bumpCartIcon === "function" && bumpCartIcon();
      };
    });
  }

  /* ---------------------------------------------------------
     10. Apparitions au scroll (échelonnées)
     --------------------------------------------------------- */
  function reveals() {
    const targets =
      ".section-header, .page-hero-content, .newsletter-box, .testimonial-card, .contact-card, .checkout-card, .cart-summary, .legal-section, .product-gallery, .filters-sidebar, .stat";
    $$(targets).forEach((el) => !el.hasAttribute("data-animate") && el.setAttribute("data-animate", ""));

    const setDelays = (g) => Array.from(g.children).forEach((el, i) => el.style.setProperty("--d", (i % 8) * 60 + "ms"));
    const grids = $$(".products-grid, .categories-grid, .features-grid, .testimonials-grid, .deal-inner");
    grids.forEach((g) => {
      setDelays(g);
      new MutationObserver(() => setDelays(g)).observe(g, { childList: true });
    });

    typeof initScrollAnimations === "function" && initScrollAnimations();
  }

  /* ---------------------------------------------------------
     Démarrage
     --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    announcementBar();
    scrollEffects();
    navPolish();
    themeSwitcher();
    searchOverlay();
    cartDrawer();
    bottomNav();
    splitHeroTitle();
    typed();
    heroEffects();
    counters();
    countdown();
    cardSpotlight();
    ripples();
    flyToCart();
    reveals();
    typeof updateCartBadge === "function" && updateCartBadge();
  });
})();
