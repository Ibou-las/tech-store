/* =========================================================
   TECH STORE — MAIN.JS
   Comportements partagés : configuration, catalogue, produits,
   boutique, fiche produit, menu, animations d'apparition.
   Dépend de js/config.js, data/products.js et js/cart.js (chargés avant).
   ========================================================= */

const CATEGORIES = [
  { key: "pc", label: "PC & Ordinateurs", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/></svg>` },
  { key: "smartphones", label: "Smartphones", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>` },
  { key: "audio", label: "Audio", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="3" y="14" width="4" height="6" rx="1"/><rect x="17" y="14" width="4" height="6" rx="1"/></svg>` },
  { key: "gaming", label: "Gaming", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 12h4M8 10v4M15 11h.01M18 13h.01"/><rect x="2" y="7" width="20" height="10" rx="5"/></svg>` },
  { key: "montres", label: "Montres", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2M9 2h6M9 22h6"/></svg>` },
  { key: "accessoires", label: "Accessoires", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>` },
];

/* ---------- Utilitaires ---------- */

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

const categoryLabel = (key) => (CATEGORIES.find((c) => c.key === key) || {}).label || "Accessoires";

/* ---------- Configuration (js/config.js) → liens et textes du site ---------- */

function applySiteConfig() {
  const S = window.SITE || {};

  document.querySelectorAll('a[href^="https://wa.me/"]').forEach((a) => {
    const search = new URL(a.href).search;
    a.href = `https://wa.me/${S.whatsapp || ""}${search}`;
    a.target = "_blank";
    a.rel = "noopener";
  });
  document.querySelectorAll('a[href^="tel:"]').forEach((a) => (a.href = `tel:+${S.phone || ""}`));
  document.querySelectorAll('a[href^="mailto:"]').forEach((a) => (a.href = `mailto:${S.email || ""}`));

  const text = { phone: S.phoneDisplay, email: S.email, address: S.address, name: S.name };
  document.querySelectorAll("[data-site]").forEach((el) => {
    const v = text[el.dataset.site];
    if (v) el.textContent = v;
  });

  // Réseaux sociaux : on n'affiche que ceux que tu as renseignés (pas de lien mort)
  document.querySelectorAll("[data-social]").forEach((el) => {
    const url = (S.social || {})[el.dataset.social];
    if (url) {
      el.href = url;
      el.target = "_blank";
      el.rel = "noopener";
    } else {
      el.hidden = true;
    }
  });
}

/* ---------- Catalogue (data/products.js) ---------- */

let PRODUCTS_CACHE = null;

async function loadProducts(forceRefresh = false) {
  if (PRODUCTS_CACHE && !forceRefresh) return PRODUCTS_CACHE;
  const S = window.SITE || {};
  let raw = null;
  if (window.supabase && S.supabaseUrl && S.supabaseAnonKey) {
    try {
      const client = window.supabase.createClient(S.supabaseUrl, S.supabaseAnonKey);
      const { data, error } = await client.from("products")
        .select("id,sku,name,category_id,price,old_price,stock,badge,description,specs,images,image_url,active,categories(slug,name)")
        .eq("active", true).order("created_at", { ascending: false });
      if (error) throw error;
      raw = (data || []).map((p) => ({
        id: String(p.id), name: p.name, category: p.categories?.slug || "accessoires",
        categoryLabel: p.categories?.name || categoryLabel(p.categories?.slug || "accessoires"),
        price: Number(p.price), oldPrice: p.old_price == null ? null : Number(p.old_price),
        badge: p.badge || "", stock: Number(p.stock), description: p.description || "",
        specs: Array.isArray(p.specs) ? p.specs : [],
        images: Array.isArray(p.images) ? p.images : (p.image_url ? [p.image_url] : []),
        image: (Array.isArray(p.images) && p.images[0]) || p.image_url || ""
      }));
    } catch (error) {
      console.error("Supabase catalogue:", error);
      if (!S.useDemoCatalog) throw error;
    }
  } else if (S.apiBase) {
    try {
      const response = await fetch(`${String(S.apiBase).replace(/\/$/, "")}/products/`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`API catalogue : HTTP ${response.status}`);
      const payload = await response.json();
      const apiProducts = Array.isArray(payload) ? payload : (Array.isArray(payload.results) ? payload.results : null);
      if (!apiProducts) throw new Error("Format de réponse API inattendu.");
      raw = apiProducts.map((p) => ({ id: String(p.id), name: p.name, category: p.category_slug || p.category_key || "accessoires",
        categoryLabel: p.category_name || categoryLabel(p.category_slug || "accessoires"), price: Number(p.price),
        oldPrice: p.old_price == null ? null : Number(p.old_price), badge: p.badge || "", stock: Number(p.stock),
        description: p.description || "", specs: Array.isArray(p.specs) ? p.specs : [], images: p.image_url ? [p.image_url] : [], image: p.image_url || "" }));
    } catch (error) { console.error(error); if (!S.useDemoCatalog) throw error; }
  }
  if (!raw) raw = window.TECHSTORE_PRODUCTS;
  if (!Array.isArray(raw)) throw new Error("Catalogue introuvable : vérifie la connexion Supabase ou data/products.js");
  const seen = new Set();
  PRODUCTS_CACHE = raw.filter((p) => {
    const ok = p && typeof p.id === "string" && p.id && typeof p.name === "string" && p.name && Number.isFinite(p.price) && p.price >= 0;
    if (!ok) console.warn("Produit ignoré (id, name ou price invalide) :", p);
    else if (seen.has(p.id)) { console.warn("Produit ignoré (id en double) :", p.id); return false; }
    if (ok) seen.add(p.id);
    return ok;
  }).map((p) => {
    const images = (Array.isArray(p.images) ? p.images : p.image ? [p.image] : []).filter((x) => typeof x === "string" && x);
    return { category: "accessoires", description: "", badge: "", oldPrice: null, ...p, images, image: images[0] || "",
      categoryLabel: p.categoryLabel || categoryLabel(p.category), specs: Array.isArray(p.specs) ? p.specs : [],
      stock: Number.isFinite(p.stock) ? p.stock : null };
  });
  return PRODUCTS_CACHE;
}

function showCatalogError(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="catalog-error" role="alert">
      <strong>Le catalogue ne s’est pas chargé.</strong>
      <p>Vérifie la connexion à l’API TECH STORE et sa configuration dans <code>js/config.js</code>.
      Ouvre la console du navigateur (touche F12) pour voir l’erreur exacte.</p>
    </div>`;
}

/* ---------- Images : remplacement local si la photo est absente ---------- */

const placeholderFor = (cat) => `images/placeholders/${CATEGORIES.some((c) => c.key === cat) ? cat : "accessoires"}.svg`;

document.addEventListener(
  "error",
  (e) => {
    const img = e.target;
    if (img && img.tagName === "IMG" && img.dataset.cat !== undefined && !img.dataset.fb) {
      img.dataset.fb = "1";
      img.src = placeholderFor(img.dataset.cat);
    }
  },
  true
);

/* ---------- Header / menu ---------- */

function initHeaderScroll() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const update = () => header.classList.toggle("scrolled", window.scrollY > 10);
  window.addEventListener("scroll", update, { passive: true });
  update();
}

function initMobileMenu() {
  const btn = document.querySelector(".mobile-menu-button");
  const nav = document.querySelector(".main-nav");
  if (!btn || !nav) return;

  nav.id = nav.id || "mainNav";
  btn.setAttribute("aria-controls", nav.id);
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-label", "Menu");

  const setOpen = (open) => {
    btn.classList.toggle("active", open);
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
  };
  btn.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
  nav.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => setOpen(false)));
}

function markActiveNavLink() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-link").forEach((link) => {
    const on = link.getAttribute("href") === page;
    link.classList.toggle("active", on);
    if (on) link.setAttribute("aria-current", "page");
  });
}

/* ---------- Catégories ---------- */

function renderCategories(containerId, linkToShop = true) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = CATEGORIES.map(
    (cat) => `
    <a href="${linkToShop ? `shop.html?cat=${cat.key}` : "#"}" class="category-card" data-animate>
      <div class="category-icon" aria-hidden="true">${cat.icon}</div>
      <div class="category-name">${cat.label}</div>
    </a>`
  ).join("");
}

/* ---------- Cartes produits ---------- */

const productUrl = (p) => `product.html?id=${encodeURIComponent(p.id)}`;
const discountOf = (p) => (p.oldPrice && p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0);

function productCardHTML(p) {
  const out = p.stock === 0;
  const pct = discountOf(p);
  let badge = "";
  if (out) badge = `<span class="product-badge out-of-stock">Rupture</span>`;
  else if (p.badge === "sale" || pct) badge = `<span class="product-badge sale">Promo${pct ? ` −${pct}%` : ""}</span>`;
  else if (p.badge === "new") badge = `<span class="product-badge new">Nouveau</span>`;

  const oldPrice = p.oldPrice && p.oldPrice > p.price ? `<span class="product-old-price">${formatPrice(p.oldPrice)}</span>` : "";
  const name = escapeHTML(p.name);
  const src = escapeHTML(p.image || placeholderFor(p.category));

  const action = out
    ? `<button type="button" class="btn btn-secondary btn-small" disabled>Rupture de stock</button>`
    : `<button type="button" class="btn btn-primary btn-small" data-add-to-cart="${escapeHTML(p.id)}" aria-label="Ajouter ${name} au panier">Ajouter au panier</button>`;

  return `
    <div class="product-card${out ? " is-out" : ""}" data-animate>
      <a href="${productUrl(p)}" class="product-image-wrapper" aria-label="${name}" tabindex="-1">
        ${badge}
        <img src="${src}" alt="${name}" width="600" height="600" loading="lazy" decoding="async" data-cat="${escapeHTML(p.category)}">
      </a>
      <div class="product-content">
        <div class="product-category">${escapeHTML(p.categoryLabel)}</div>
        <a href="${productUrl(p)}" class="product-link"><h3 class="product-name">${name}</h3></a>
        <p class="product-description">${escapeHTML(p.description)}</p>
        <div class="product-price-wrapper">
          <div><span class="product-price">${formatPrice(p.price)}</span>${oldPrice}</div>
        </div>
        <div class="product-actions">${action}</div>
      </div>
    </div>`;
}

/* Clic sur « Ajouter au panier » (délégation : fonctionne sur toutes les cartes) */
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-add-to-cart]");
  if (!btn) return;
  let products;
  try {
    products = await loadProducts();
  } catch (err) {
    return;
  }
  const product = products.find((p) => p.id === btn.dataset.addToCart);
  if (!product) return;
  if (addToCart(product, 1)) {
    const img = btn.closest(".product-card")?.querySelector("img");
    window.dispatchEvent(new CustomEvent("cart:fly", { detail: { image: img } }));
  }
});

async function renderFeaturedProducts(containerId, limit = 8) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const products = await loadProducts();
    container.innerHTML = products.slice(0, limit).map(productCardHTML).join("");
    initScrollAnimations();
  } catch (e) {
    console.error(e);
    showCatalogError(container);
  }
}

/* ---------- Boutique : recherche, filtres, puces, liens partageables ---------- */

async function initShopPage() {
  const grid = document.getElementById("shopProductsGrid");
  if (!grid) return;

  let products;
  try {
    products = await loadProducts();
  } catch (e) {
    console.error(e);
    return showCatalogError(grid);
  }

  const searchInput = document.getElementById("shopSearchInput");
  const sortSelect = document.getElementById("shopSort");
  const budgetSelect = document.getElementById("shopBudget");
  const promoBox = document.getElementById("filterPromo");
  const catCheckboxes = document.querySelectorAll(".filter-category");
  const resultsLabel = document.getElementById("shopResultsLabel");
  const chips = document.querySelectorAll("#shopChips [data-chip]");

  const urlCat = getQueryParam("cat");
  if (urlCat) catCheckboxes.forEach((cb) => (cb.checked = cb.value === urlCat));
  if (searchInput && getQueryParam("q")) searchInput.value = getQueryParam("q");
  if (promoBox && getQueryParam("promo") === "1") promoBox.checked = true;
  if (budgetSelect && getQueryParam("budget")) budgetSelect.value = getQueryParam("budget");
  if (sortSelect && getQueryParam("sort")) sortSelect.value = getQueryParam("sort");

  const isPromo = (p) => p.badge === "sale" || discountOf(p) > 0;
  const inBudget = (p, b) =>
    b === "all" ||
    (b === "lt50" && p.price < 50000) ||
    (b === "50-200" && p.price >= 50000 && p.price < 200000) ||
    (b === "200-500" && p.price >= 200000 && p.price < 500000) ||
    (b === "gt500" && p.price >= 500000);

  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // « ecran » trouve « Écran »

  function getFilters() {
    return {
      query: norm(searchInput?.value || "").trim(),
      cats: Array.from(catCheckboxes).filter((cb) => cb.checked).map((cb) => cb.value),
      sort: sortSelect?.value || "default",
      budget: budgetSelect?.value || "all",
      promo: !!promoBox?.checked,
    };
  }

  function syncChips({ cats, promo }) {
    chips.forEach((chip) => {
      const k = chip.dataset.chip;
      const on = k === "all" ? !cats.length && !promo : k === "promo" ? promo : cats.includes(k);
      chip.classList.toggle("active", on);
      chip.setAttribute("aria-pressed", String(on));
    });
  }

  function syncUrl(f) {
    const q = new URLSearchParams();
    if (f.cats.length === 1) q.set("cat", f.cats[0]);
    if (searchInput?.value.trim()) q.set("q", searchInput.value.trim());
    if (f.promo) q.set("promo", "1");
    if (f.budget !== "all") q.set("budget", f.budget);
    if (f.sort !== "default") q.set("sort", f.sort);
    try {
      history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : ""));
    } catch (e) {
      /* ouverture en file:// : l'adresse n'est pas mise à jour */
    }
  }

  function apply() {
    const f = getFilters();
    let list = products.filter(
      (p) =>
        (!f.query || norm(`${p.name} ${p.categoryLabel} ${p.description}`).includes(f.query)) &&
        (f.cats.length === 0 || f.cats.includes(p.category)) &&
        inBudget(p, f.budget) &&
        (!f.promo || isPromo(p))
    );

    if (f.sort === "price-asc") list = list.slice().sort((a, b) => a.price - b.price);
    if (f.sort === "price-desc") list = list.slice().sort((a, b) => b.price - a.price);

    grid.innerHTML = list.length
      ? list.map(productCardHTML).join("")
      : `<div class="empty-state" style="grid-column:1/-1">
          <h2 class="empty-state-title">Aucun produit trouvé</h2>
          <p class="empty-state-text">Essaie une autre recherche, une autre catégorie ou un autre budget.</p>
          <a href="shop.html" class="btn btn-primary">Voir tous les produits</a>
        </div>`;

    if (resultsLabel) resultsLabel.textContent = `${list.length} produit${list.length > 1 ? "s" : ""}`;
    syncChips(f);
    syncUrl(f);
    initScrollAnimations();
  }

  searchInput?.addEventListener("input", apply);
  sortSelect?.addEventListener("change", apply);
  budgetSelect?.addEventListener("change", apply);
  promoBox?.addEventListener("change", apply);
  catCheckboxes.forEach((cb) => cb.addEventListener("change", apply));

  chips.forEach((chip) =>
    chip.addEventListener("click", () => {
      const k = chip.dataset.chip;
      if (k === "all") {
        catCheckboxes.forEach((cb) => (cb.checked = false));
        if (promoBox) promoBox.checked = false;
      } else if (k === "promo") {
        if (promoBox) promoBox.checked = !promoBox.checked;
      } else {
        const wasOn = chip.classList.contains("active");
        catCheckboxes.forEach((cb) => (cb.checked = !wasOn && cb.value === k));
      }
      apply();
    })
  );

  apply();
}

/* ---------- Fiche produit ---------- */

function setHeadMeta(selector, attr, value, create) {
  let el = document.head.querySelector(selector);
  if (!el && create) {
    el = document.createElement(create.tag);
    Object.entries(create.attrs).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  if (el) el.setAttribute(attr, value);
}

function updateProductSEO(product, outOfStock) {
  const S = window.SITE || {};
  const base = (S.domain || location.origin).replace(/\/$/, "");
  const abs = (path) => (/^https?:/.test(path) ? path : `${base}/${String(path).replace(/^\//, "")}`);
  const url = `${base}/${location.pathname.split("/").pop() || "product.html"}?id=${encodeURIComponent(product.id)}`;
  const images = (product.images && product.images.length ? product.images : [placeholderFor(product.category)]).map(abs);
  const image = images[0];
  const title = `${product.name} — ${S.name || "TECH STORE"}`;
  const desc = `${product.name} à ${formatPrice(product.price)}. ${product.description}`.slice(0, 200);

  document.title = title;
  setHeadMeta('meta[name="description"]', "content", desc, { tag: "meta", attrs: { name: "description" } });
  const og = { "og:title": title, "og:description": desc, "og:image": image, "og:url": url, "og:type": "product" };
  Object.entries(og).forEach(([prop, v]) => setHeadMeta(`meta[property="${prop}"]`, "content", v, { tag: "meta", attrs: { property: prop } }));
  setHeadMeta('link[rel="canonical"]', "href", url, { tag: "link", attrs: { rel: "canonical" } });

  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: images,
    description: product.description,
    sku: product.id,
    category: product.categoryLabel,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "XOF",
      price: String(product.price),
      availability: outOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    },
  };
  let script = document.getElementById("productLD");
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "productLD";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(ld);
}

async function initProductDetailPage() {
  const wrap = document.getElementById("productDetailWrap");
  if (!wrap) return;
  const missing = document.getElementById("productMissing");
  const relatedGrid = document.getElementById("pdRelatedGrid");

  let products;
  try {
    products = await loadProducts();
  } catch (e) {
    console.error(e);
    wrap.hidden = true;
    if (missing) missing.hidden = false;
    showCatalogError(missing || relatedGrid);
    return;
  }

  const id = document.body.dataset.productId || getQueryParam("id");
  const product = products.find((p) => p.id === id);

  // Produit inconnu : message clair + suggestions (au lieu d'afficher un autre produit)
  if (!product) {
    wrap.hidden = true;
    if (missing) missing.hidden = false;
    document.title = "Produit introuvable — " + ((window.SITE || {}).name || "TECH STORE");
    setHeadMeta('meta[name="robots"]', "content", "noindex", { tag: "meta", attrs: { name: "robots" } });
    document.getElementById("pdBreadcrumbName").textContent = "Introuvable";
    const t = document.getElementById("pdRelatedTitle");
    if (t) t.innerHTML = "Nos produits <span>populaires</span>";
    if (relatedGrid) relatedGrid.innerHTML = products.slice(0, 4).map(productCardHTML).join("");
    return initScrollAnimations();
  }

  const out = product.stock === 0;
  const pct = discountOf(product);
  updateProductSEO(product, out);

  document.getElementById("pdCategory").textContent = product.categoryLabel;
  document.getElementById("pdTitle").textContent = product.name;
  document.getElementById("pdBreadcrumbName").textContent = product.name;
  document.getElementById("pdDescription").textContent = product.description;

  const price = document.getElementById("pdPrice");
  price.textContent = formatPrice(product.price);
  if (pct) {
    const old = document.createElement("span");
    old.className = "pd-old-price";
    old.textContent = formatPrice(product.oldPrice);
    const tag = document.createElement("span");
    tag.className = "pd-discount";
    tag.textContent = `−${pct}%`;
    price.append(old, tag);
  }

  const img = document.getElementById("pdMainImage");
  img.dataset.cat = product.category;
  img.src = product.image || placeholderFor(product.category);
  img.setAttribute("alt", product.name);

  // Galerie : miniatures cliquables quand il y a plusieurs photos
  const thumbs = document.getElementById("pdThumbs");
  if (thumbs) {
    if (product.images.length > 1) {
      thumbs.innerHTML = product.images
        .map(
          (src, i) => `
        <button type="button" class="product-thumbnail${i === 0 ? " active" : ""}" data-i="${i}" aria-pressed="${i === 0}" aria-label="Voir la photo ${i + 1} sur ${product.images.length}">
          <img src="${escapeHTML(src)}" alt="" width="120" height="120" loading="lazy" data-cat="${escapeHTML(product.category)}">
        </button>`
        )
        .join("");
      thumbs.addEventListener("click", (e) => {
        const b = e.target.closest(".product-thumbnail");
        if (!b) return;
        const i = Number(b.dataset.i);
        img.src = product.images[i];
        img.removeAttribute("data-fb");
        thumbs.querySelectorAll(".product-thumbnail").forEach((t, j) => {
          t.classList.toggle("active", j === i);
          t.setAttribute("aria-pressed", String(j === i));
        });
      });
    } else {
      thumbs.hidden = true;
    }
  }

  const specs = document.getElementById("pdSpecs");
  specs.innerHTML = product.specs.map((s) => `<li>${escapeHTML(s)}</li>`).join("");
  specs.hidden = !product.specs.length;

  // Stock
  const stockEl = document.getElementById("pdStock");
  const max = product.stock === null ? 99 : product.stock;
  if (out) {
    stockEl.textContent = "Rupture de stock";
    stockEl.className = "product-stock out";
  } else if (product.stock !== null && product.stock <= 5) {
    stockEl.textContent = `Plus que ${product.stock} en stock`;
    stockEl.className = "product-stock low";
  } else {
    stockEl.textContent = "En stock";
    stockEl.className = "product-stock";
  }

  const qtyInput = document.getElementById("pdQty");
  const addBtn = document.getElementById("pdAddToCart");
  const buyBtn = document.getElementById("pdBuyNow");
  const qtyBox = qtyInput.closest(".quantity-control");

  if (out) {
    addBtn.disabled = true;
    addBtn.textContent = "Rupture de stock";
    buyBtn.hidden = true;
    qtyBox.hidden = true;
  }

  document.getElementById("pdQtyMinus").addEventListener("click", () => {
    qtyInput.value = Math.max(1, parseInt(qtyInput.value, 10) - 1);
  });
  document.getElementById("pdQtyPlus").addEventListener("click", () => {
    const next = parseInt(qtyInput.value, 10) + 1;
    if (next > max) showToast(`Stock limité : ${max} disponible${max > 1 ? "s" : ""}`, "warning");
    qtyInput.value = Math.min(max, next);
  });

  addBtn.addEventListener("click", () => {
    if (addToCart(product, parseInt(qtyInput.value, 10) || 1)) {
      window.dispatchEvent(new CustomEvent("cart:fly", { detail: { image: img } }));
    }
  });
  buyBtn.addEventListener("click", () => {
    if (addToCart(product, parseInt(qtyInput.value, 10) || 1)) window.location.href = "cart.html";
  });

  // Partage (WhatsApp, Facebook, copier le lien)
  const shareUrl = location.href;
  const shareText = `${product.name} — ${formatPrice(product.price)}`;
  const wa = document.getElementById("shareWhatsApp");
  const fb = document.getElementById("shareFacebook");
  const nat = document.getElementById("shareNative");
  if (wa) wa.href = `https://wa.me/?text=${encodeURIComponent(shareText + "\n" + shareUrl)}`;
  if (fb) fb.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  if (nat) {
    nat.addEventListener("click", async () => {
      try {
        if (navigator.share) return await navigator.share({ title: product.name, text: shareText, url: shareUrl });
        await navigator.clipboard.writeText(shareUrl);
        showToast("Lien copié", "success");
      } catch (e) {
        if (e && e.name !== "AbortError") showToast("Copie le lien depuis la barre d’adresse", "warning");
      }
    });
  }

  // Produits similaires
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
  const list = related.length ? related : products.filter((p) => p.id !== product.id).slice(0, 4);
  if (relatedGrid) relatedGrid.innerHTML = list.map(productCardHTML).join("");
  initScrollAnimations();
}

/* ---------- Formulaire de contact → WhatsApp ---------- */

function initContactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const text = [`Bonjour ${(window.SITE || {}).name || ""},`, "", data.get("message"), "", `— ${data.get("name")} (${data.get("phone")})`].join("\n");
    const url = waLink(text);
    if (!window.open(url, "_blank")) window.location.href = url;
    showToast("WhatsApp s’ouvre : envoie le message pour nous le transmettre", "success");
  });
}

/* ---------- Maintenance à distance : formulaire → WhatsApp ---------- */

function initServiceForm() {
  const form = document.getElementById("serviceForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const text = [
      "Bonjour, j’ai besoin d’une maintenance à distance.",
      "",
      `Problème : ${d.get("type")}`,
      `Appareil : ${d.get("device")}`,
      d.get("urgent") ? "⚠ C’est urgent" : "",
      "",
      `Description : ${d.get("message")}`,
      "",
      `— ${d.get("name")} (${d.get("phone")})`,
    ].filter((l, i, a) => l !== "" || (a[i - 1] !== "" && i > 0)).join("\n");
    const url = waLink(text);
    if (!window.open(url, "_blank")) window.location.href = url;
    showToast("WhatsApp s’ouvre : envoie le message pour transmettre ta demande", "success");
  });
}

/* ---------- Animations au scroll ---------- */

function initScrollAnimations() {
  const items = document.querySelectorAll("[data-animate]:not(.is-visible)");
  if (!("IntersectionObserver" in window)) {
    items.forEach((i) => i.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  items.forEach((item) => observer.observe(item));
}

/* ---------- Application installable + hors-ligne (HTTPS uniquement) ---------- */

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

/* ---------- Init global ---------- */

document.addEventListener("DOMContentLoaded", () => {
  applySiteConfig();
  initHeaderScroll();
  initMobileMenu();
  markActiveNavLink();
  initScrollAnimations();
  initShopPage();
  initProductDetailPage();
  initContactForm();
  initServiceForm();
  registerServiceWorker();
});
