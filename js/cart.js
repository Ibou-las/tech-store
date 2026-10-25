/* =========================================================
   TECH STORE — CART.JS
   Panier (localStorage), toasts, prix, commande WhatsApp.
   Dépend de js/config.js (window.SITE), chargé avant.
   ========================================================= */

const CART_KEY = "techstore_cart";

const SITE_CFG = () => window.SITE || {};

/* ---------- Prix ---------- */

function formatPrice(amount) {
  // espace insécable : un prix ne se coupe jamais en fin de ligne
  return new Intl.NumberFormat("fr-FR").format(amount).replace(/[\u202f\u00a0\s]/g, "\u00a0") + "\u00a0FCFA";
}

/* ---------- Stockage sécurisé ----------
   Si le navigateur bloque le stockage (navigation privée stricte),
   le panier reste en mémoire pour la page en cours au lieu de planter. */

let memoryCart = [];
let canPersist = true;

function cleanCart(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((i) => i && typeof i.id === "string" && Number.isFinite(i.price) && i.price >= 0 && Number.isInteger(i.qty) && i.qty > 0)
    .map((i) => ({
      id: i.id,
      name: String(i.name || ""),
      price: i.price,
      image: String(i.image || ""),
      qty: i.qty,
      stock: Number.isFinite(i.stock) ? i.stock : null,
      category: String(i.category || ""),
    }));
}

function getCart() {
  if (canPersist) {
    try {
      const raw = localStorage.getItem(CART_KEY);
      memoryCart = raw ? cleanCart(JSON.parse(raw)) : [];
    } catch (e) {
      canPersist = false;
    }
  }
  return memoryCart.map((i) => ({ ...i }));
}

function saveCart(cart) {
  memoryCart = cleanCart(cart);
  if (canPersist) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(memoryCart));
    } catch (e) {
      canPersist = false;
    }
  }
  if (!canPersist && !saveCart.warned) {
    saveCart.warned = true;
    showToast("Ton navigateur bloque l’enregistrement du panier : il sera perdu si tu changes de page.", "warning");
  }
  updateCartBadge();
  window.dispatchEvent(new CustomEvent("cart:updated"));
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function getCartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.qty, 0);
}

/* ---------- Livraison ---------- */

function getDeliveryFee() {
  const f = SITE_CFG().deliveryFee;
  return Number.isFinite(f) && f >= 0 ? f : null; // null = à confirmer
}

function getOrderTotal() {
  return getCartTotal() + (getDeliveryFee() || 0);
}

function deliveryLabel() {
  const f = getDeliveryFee();
  return f === null ? "À confirmer sur WhatsApp" : f === 0 ? "Offerte" : formatPrice(f);
}

function totalLabel() {
  return getDeliveryFee() === null ? "Total (hors livraison)" : "Total";
}

/* ---------- Actions panier ---------- */

function addToCart(product, qty = 1) {
  qty = Math.max(1, parseInt(qty, 10) || 1);
  const stock = Number.isFinite(product.stock) ? product.stock : null;

  if (stock === 0) {
    showToast(`${product.name} est en rupture de stock`, "error");
    return false;
  }

  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);
  const current = existing ? existing.qty : 0;
  let next = current + qty;
  let capped = false;

  if (stock !== null && next > stock) {
    next = stock;
    capped = true;
  }
  if (next === current) {
    showToast(`Stock limité : ${stock} disponible${stock > 1 ? "s" : ""}, déjà dans ton panier`, "warning");
    return false;
  }

  if (existing) {
    existing.qty = next;
    existing.stock = stock;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, qty: next, stock, category: product.category || "" });
  }

  saveCart(cart);
  showToast(
    capped ? `Stock limité : ${stock} disponible${stock > 1 ? "s" : ""} — quantité ajustée` : `${product.name} ajouté au panier`,
    capped ? "warning" : "success"
  );
  bumpCartIcon();
  return true;
}

function removeFromCart(id) {
  saveCart(getCart().filter((item) => item.id !== id));
  showToast("Produit retiré du panier", "warning");
  if (typeof renderCartPage === "function") renderCartPage();
}

function updateCartQty(id, qty) {
  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  if (!item) return;

  if (qty <= 0) {
    removeFromCart(id);
    return;
  }
  if (item.stock !== null && qty > item.stock) {
    showToast(`Stock limité : ${item.stock} disponible${item.stock > 1 ? "s" : ""}`, "warning");
    qty = item.stock;
  }

  item.qty = qty;
  saveCart(cart);
  if (typeof renderCartPage === "function") renderCartPage();
}

function clearCart() {
  saveCart([]);
  if (typeof renderCartPage === "function") renderCartPage();
}

/* Met le panier à jour avec le catalogue actuel (prix modifiés, produits retirés, stock) */
async function syncCartWithCatalog() {
  if (typeof loadProducts !== "function") return false;
  let products;
  try {
    products = await loadProducts();
  } catch (e) {
    return false;
  }
  const byId = new Map(products.map((p) => [p.id, p]));
  const next = [];
  const removed = [];
  let changed = false;
  let priceChanged = false;

  for (const item of getCart()) {
    const p = byId.get(item.id);
    if (!p || p.stock === 0) {
      removed.push(item.name);
      changed = true;
      continue;
    }
    const qty = p.stock > 0 ? Math.min(item.qty, p.stock) : item.qty;
    const merged = { ...item, name: p.name, price: p.price, image: p.image, stock: p.stock, category: p.category, qty };
    if (merged.price !== item.price) priceChanged = true;
    if (JSON.stringify(merged) !== JSON.stringify(item)) changed = true;
    next.push(merged);
  }

  if (changed) {
    saveCart(next);
    if (removed.length) showToast(`Retiré du panier (indisponible) : ${removed.join(", ")}`, "warning");
    else if (priceChanged) showToast("Certains prix ont été mis à jour", "warning");
  }
  return changed;
}

/* ---------- Badge panier (header) ---------- */

function updateCartBadge() {
  const count = getCartCount();
  document.querySelectorAll(".cart-count").forEach((el) => {
    el.textContent = count;
  });
  document.querySelectorAll('.header-action[href="cart.html"]').forEach((a) => {
    a.setAttribute("aria-label", count ? `Panier, ${count} article${count > 1 ? "s" : ""}` : "Panier");
  });
}

function bumpCartIcon() {
  document.querySelectorAll(".cart-count").forEach((el) => {
    el.classList.remove("bump");
    void el.offsetWidth; // relance l'animation
    el.classList.add("bump");
  });
}

/* ---------- Toast notifications ---------- */

function showToast(message, type = "success") {
  let container = document.querySelector(".toast-container");

  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  container.setAttribute("role", "status");
  container.setAttribute("aria-live", "polite");

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toastOut 0.3s ease forwards";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/* ---------- WhatsApp ---------- */

function waLink(text) {
  const number = SITE_CFG().whatsapp || "";
  return `https://wa.me/${number}${text ? "?text=" + encodeURIComponent(text) : ""}`;
}

function orderReference() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const seconds = p(d.getSeconds());
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TS-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${seconds}-${suffix}`;
}

function buildWhatsAppOrderMessage(customer, ref = orderReference()) {
  const fee = getDeliveryFee();
  const lines = [`Bonjour ${SITE_CFG().name || ""}, je souhaite commander (réf. ${ref}) :`, ""];

  getCart().forEach((item) => {
    lines.push(`• ${item.name} × ${item.qty} — ${formatPrice(item.price * item.qty)}`);
  });

  lines.push("");
  lines.push(`Sous-total : ${formatPrice(getCartTotal())}`);
  lines.push(`Livraison : ${fee === null ? "à confirmer" : fee === 0 ? "offerte" : formatPrice(fee)}`);
  lines.push(`*${totalLabel()} : ${formatPrice(getOrderTotal())}*`);
  lines.push("");
  lines.push(`Nom : ${customer.name}`);
  lines.push(`Téléphone : ${customer.phone}`);
  lines.push(`Région : ${customer.region || "Non précisée"}`);
  lines.push(`Ville : ${customer.city}`);
  lines.push(`Réception : ${customer.fulfilment === "store_pickup" ? "Retrait en boutique" : customer.fulfilment === "regional_delivery" ? "Livraison régionale" : "Livraison à Dakar"}`);
  lines.push(`Adresse : ${customer.address}`);
  lines.push(`Paiement souhaité : ${customer.payment}`);

  return waLink(lines.join("\n"));
}

/* ---------- Init sur chaque page ---------- */

document.addEventListener("DOMContentLoaded", updateCartBadge);
