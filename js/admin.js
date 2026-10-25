/* =========================================================
   TECH STORE — ADMIN.JS
   Gestion des produits : nom, prix, promo, stock, catégorie, photos.

   - Tout se passe dans TON navigateur : rien n'est envoyé à un serveur.
   - Ton travail est gardé en brouillon sur cet appareil.
   - « Publier » écrit les fichiers dans le dossier du site (Chrome/Edge sur
     ordinateur) ou télécharge un ZIP à mettre en ligne.
   Dépend de : config.js, products.js, site-files.js, cart.js, main.js, zip.js
   ========================================================= */

(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = escapeHTML;
  const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const MAX_PHOTOS = 8;
  const MAX_SIDE = 900; // taille max d'une photo (pixels)
  const TARGET_KB = 120; // poids visé par photo
  const labelOf = (key) => (CATEGORIES.find((c) => c.key === key) || {}).label || "Accessoires";

  const PRODUCTS_HEADER = `/* =========================================================
   TECH STORE — CATALOGUE PRODUITS

   Le plus simple : utilise la page admin.html (formulaire + photos).
   Elle réécrit ce fichier pour toi. Tu peux aussi le modifier à la main.

   Chaque produit a :
     id           identifiant unique, sans espace (ex. "p013")
     name         nom affiché
     category     pc | smartphones | audio | gaming | montres | accessoires
     categoryLabel  libellé affiché (ex. "Smartphones")
     price        prix actuel en FCFA, nombre sans espace (ex. 850000)
     oldPrice     ancien prix barré = prix normal si le produit est en promo (sinon null)
     badge        "sale" (Promo), "new" (Nouveau) ou ""
     stock        quantité disponible (0 = rupture, le bouton est désactivé)
     images       liste de photos, la 1re est la principale
                  ex. ["images/products/p013-a1b2.webp", "images/products/p013-c3d4.webp"]
                  (liste vide = image « Photo à venir »)
     description  texte court
     specs        liste de caractéristiques

   ⚠ Les produits ci-dessous sont des EXEMPLES : remplace-les par les tiens.
   ========================================================= */

window.TECHSTORE_PRODUCTS = `;

  /* ------------------------------------------------------------------ état */
  let products = [];
  let baseline = new Map(); // id → JSON du produit tel que publié
  let editing = null; // produit en cours d'édition dans la fenêtre
  let dirHandle = null; // dossier du site (mode « enregistrer dans le dossier »)
  let saveTimer = 0;
  let persistOK = true;

  /* ------------------------------------------------------------------ conversions */
  function fromRaw(raw) {
    return raw
      .filter((p) => p && typeof p.id === "string" && p.id)
      .map((p) => {
        const paths = (Array.isArray(p.images) ? p.images : p.image ? [p.image] : []).filter(
          (x) => typeof x === "string" && x && !x.startsWith("images/placeholders/")
        );
        return {
          id: p.id,
          name: String(p.name || ""),
          category: CATEGORIES.some((c) => c.key === p.category) ? p.category : "accessoires",
          price: Number.isFinite(p.price) ? p.price : 0,
          oldPrice: Number.isFinite(p.oldPrice) && p.oldPrice > 0 ? p.oldPrice : null,
          badge: p.badge === "sale" || p.badge === "new" ? p.badge : "",
          stock: Number.isFinite(p.stock) ? p.stock : 99,
          description: String(p.description || ""),
          specs: Array.isArray(p.specs) ? p.specs.map(String) : [],
          images: paths.map((path) => ({ path, url: path })),
        };
      });
  }

  const toPublic = (p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    categoryLabel: labelOf(p.category),
    price: p.price,
    oldPrice: p.oldPrice,
    badge: p.badge,
    stock: p.stock,
    images: p.images.map((i) => i.path),
    description: p.description,
    specs: p.specs,
  });

  const signature = (p) => JSON.stringify(toPublic(p));

  function diffCount() {
    const current = new Map(products.map((p) => [p.id, signature(p)]));
    let n = 0;
    current.forEach((sig, id) => baseline.get(id) !== sig && n++);
    baseline.forEach((_, id) => !current.has(id) && n++);
    return n;
  }

  const markPublished = () => (baseline = new Map(products.map((p) => [p.id, signature(p)])));

  /* ------------------------------------------------------------------ brouillon (IndexedDB) */
  const idb = () =>
    new Promise((resolve, reject) => {
      const req = indexedDB.open("techstore-admin", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("kv");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  async function kv(mode, key, value) {
    const db = await idb();
    return new Promise((resolve, reject) => {
      const store = db.transaction("kv", mode === "get" ? "readonly" : "readwrite").objectStore("kv");
      const req = mode === "get" ? store.get(key) : mode === "set" ? store.put(value, key) : store.delete(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        if (diffCount() === 0) await kv("del", "draft");
        else
          await kv("set", "draft", {
            savedAt: Date.now(),
            products: products.map((p) => ({
              ...p,
              images: p.images.map((i) => ({ path: i.path, blob: i.blob || null, size: i.size || 0, written: !!i.written })),
            })),
          });
        persistOK = true;
      } catch (e) {
        persistOK = false;
      }
      updateStatus();
    }, 350);
  }

  /* ------------------------------------------------------------------ affichage de la liste */
  const listEl = $("#adList");

  function cardHTML(p) {
    const promo = p.oldPrice && p.oldPrice > p.price;
    const pct = promo ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    const src = p.images[0] ? p.images[0].url : placeholderFor(p.category);
    const out = p.stock === 0;
    return `
    <article class="ad-item${out ? " is-out" : ""}" data-id="${esc(p.id)}">
      <img class="ad-thumb" src="${esc(src)}" alt="" width="84" height="84" data-cat="${esc(p.category)}">
      <div class="ad-info">
        <h2 class="ad-name">${esc(p.name || "(sans nom)")}</h2>
        <p class="ad-meta">${esc(labelOf(p.category))} · ${p.images.length} photo${p.images.length > 1 ? "s" : ""}</p>
        <p class="ad-price">
          <strong>${formatPrice(p.price)}</strong>
          ${promo ? `<s>${formatPrice(p.oldPrice)}</s> <span class="ad-tag ad-tag-sale">Promo −${pct}%</span>` : ""}
          ${!promo && p.badge === "new" ? `<span class="ad-tag ad-tag-new">Nouveau</span>` : ""}
          ${out ? `<span class="ad-tag ad-tag-out">Rupture</span>` : ""}
        </p>
        <div class="ad-stock" role="group" aria-label="Stock de ${esc(p.name)}">
          <span>Stock</span>
          <button type="button" class="ad-mini" data-act="stock-minus" aria-label="Retirer 1 au stock de ${esc(p.name)}">−</button>
          <input type="number" min="0" max="9999" step="1" value="${p.stock}" class="ad-stock-input" data-act="stock-set" aria-label="Stock de ${esc(p.name)}">
          <button type="button" class="ad-mini" data-act="stock-plus" aria-label="Ajouter 1 au stock de ${esc(p.name)}">+</button>
        </div>
      </div>
      <div class="ad-actions">
        <button type="button" class="btn btn-primary btn-small" data-act="edit">Modifier</button>
        ${promo ? `<button type="button" class="btn btn-secondary btn-small" data-act="unpromo">Retirer la promo</button>` : ""}
        <button type="button" class="btn btn-secondary btn-small" data-act="dup">Dupliquer</button>
        <button type="button" class="btn btn-danger btn-small" data-act="del">Supprimer</button>
      </div>
    </article>`;
  }

  function render() {
    const q = norm($("#adSearch").value).trim();
    const cat = $("#adCat").value;
    const list = products.filter((p) => (!cat || p.category === cat) && (!q || norm(p.name).includes(q) || p.id.includes(q)));
    listEl.innerHTML = list.length
      ? list.map(cardHTML).join("")
      : `<div class="empty-state"><h2 class="empty-state-title">${products.length ? "Aucun produit trouvé" : "Aucun produit pour l’instant"}</h2>
         <p class="empty-state-text">${products.length ? "Essaie une autre recherche." : "Clique sur « Nouveau produit » pour ajouter le premier."}</p></div>`;
    $("#adCount").textContent = `${list.length} produit${list.length > 1 ? "s" : ""}${list.length !== products.length ? ` sur ${products.length}` : ""}`;
    updateStatus();
  }

  function updateStatus() {
    const n = diffCount();
    $("#adBarText").textContent = n ? `${n} modification${n > 1 ? "s" : ""} non publiée${n > 1 ? "s" : ""}` : "Tout est publié";
    $("#adBarSub").textContent = n
      ? persistOK
        ? "Brouillon gardé sur cet appareil"
        : "Brouillon NON gardé (navigation privée ?) : publie avant de fermer la page"
      : "Le catalogue du site est à jour";
    $("#adReset").hidden = n === 0;
    $(".ad-bar").classList.toggle("has-changes", n > 0);
  }

  /* ------------------------------------------------------------------ actions sur la liste */
  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn || btn.tagName === "INPUT") return;
    const id = btn.closest(".ad-item").dataset.id;
    const p = products.find((x) => x.id === id);
    if (!p) return;
    const act = btn.dataset.act;

    if (act === "edit") return openEditor(id);
    if (act === "stock-minus" || act === "stock-plus") {
      p.stock = Math.max(0, Math.min(9999, p.stock + (act === "stock-plus" ? 1 : -1)));
    } else if (act === "unpromo") {
      p.price = p.oldPrice;
      p.oldPrice = null;
      p.badge = "";
    } else if (act === "dup") {
      const copy = { ...p, id: nextId(), name: `${p.name} (copie)`, specs: [...p.specs], images: p.images.map((i) => ({ ...i })) };
      products.splice(products.indexOf(p) + 1, 0, copy);
      showToast("Produit dupliqué : pense à changer son nom", "success");
    } else if (act === "del") {
      if (!confirm(`Supprimer « ${p.name} » du catalogue ?\n(Tu pourras annuler tant que tu n’as pas publié.)`)) return;
      products.splice(products.indexOf(p), 1);
    }
    scheduleSave();
    render();
    const again = listEl.querySelector(`[data-id="${CSS.escape(id)}"] [data-act="${act}"]`);
    if (again) again.focus();
  });

  listEl.addEventListener("change", (e) => {
    const input = e.target.closest('input[data-act="stock-set"]');
    if (!input) return;
    const p = products.find((x) => x.id === input.closest(".ad-item").dataset.id);
    const v = Math.round(Number(input.value));
    p.stock = Number.isFinite(v) ? Math.max(0, Math.min(9999, v)) : p.stock;
    scheduleSave();
    render();
  });

  $("#adSearch").addEventListener("input", render);
  $("#adCat").addEventListener("change", render);
  $("#adNew").addEventListener("click", () => openEditor(null));

  function nextId() {
    const nums = products.map((p) => /^p(\d+)$/.exec(p.id)).filter(Boolean).map((m) => Number(m[1]));
    let n = (nums.length ? Math.max(...nums) : 0) + 1;
    let id;
    do id = "p" + String(n++).padStart(3, "0");
    while (products.some((p) => p.id === id));
    return id;
  }

  /* ------------------------------------------------------------------ fenêtre d'édition */
  const dlg = $("#adDialog");
  const F = {
    name: $("#fName"), cat: $("#fCat"), price: $("#fPrice"), promo: $("#fPromo"), promoPrice: $("#fPromoPrice"),
    isNew: $("#fNew"), stock: $("#fStock"), desc: $("#fDesc"), specs: $("#fSpecs"), files: $("#fFiles"),
  };

  const toInt = (v) => {
    const s = String(v).replace(/[\s\u00a0]/g, "").replace(",", ".");
    if (s === "") return NaN;
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n) : NaN;
  };

  function openEditor(id) {
    const src = id
      ? products.find((p) => p.id === id)
      : { id: nextId(), name: "", category: "pc", price: "", oldPrice: null, badge: "", stock: 1, description: "", specs: [], images: [] };
    const promo = !!(src.oldPrice && src.oldPrice > src.price) || src.badge === "sale";

    editing = { isNew: !id, id: src.id, images: src.images.map((i) => ({ ...i })), original: id ? src : null };
    $("#adDialogTitle").textContent = id ? "Modifier le produit" : "Nouveau produit";
    $("#adDelete").hidden = !id;

    F.name.value = src.name;
    F.cat.value = src.category;
    F.price.value = promo ? src.oldPrice || "" : src.price;
    F.promo.checked = promo;
    F.promoPrice.value = promo ? src.price : "";
    F.isNew.checked = src.badge === "new";
    F.stock.value = src.stock;
    F.desc.value = src.description;
    F.specs.value = src.specs.join("\n");
    F.files.value = "";
    $("#fErrors").hidden = true;
    $("#fPhotoMsg").textContent = "";
    syncPromoUI();
    renderPhotos();
    updatePreview();
    dlg.showModal();
  }

  function syncPromoUI() {
    const on = F.promo.checked;
    $("#fPromoBox").hidden = !on;
    F.isNew.disabled = on;
    $("#fNewHint").textContent = on ? "L’étiquette « Promo » remplace « Nouveau » tant que le produit est en promotion." : "";
    const normal = toInt(F.price.value), promo = toInt(F.promoPrice.value);
    $("#fPct").textContent = on && normal > 0 && promo > 0 && promo < normal ? `Remise affichée : −${Math.round((1 - promo / normal) * 100)} %` : "";
  }

  function readForm() {
    const promo = F.promo.checked;
    return {
      name: F.name.value.trim(),
      category: F.cat.value,
      normal: toInt(F.price.value),
      promo,
      promoPrice: toInt(F.promoPrice.value),
      isNew: F.isNew.checked && !promo,
      stock: toInt(F.stock.value),
      description: F.desc.value.trim(),
      specs: F.specs.value.split("\n").map((s) => s.trim()).filter(Boolean),
    };
  }

  function validate(d) {
    const errors = [];
    const bad = (field, msg) => errors.push({ field, msg });
    if (d.name.length < 2 || d.name.length > 80) bad(F.name, "Le nom doit faire entre 2 et 80 caractères.");
    if (!(d.normal >= 1)) bad(F.price, "Indique un prix en FCFA (nombre entier, au moins 1).");
    if (d.promo) {
      if (!(d.promoPrice >= 1)) bad(F.promoPrice, "Indique le prix promo en FCFA.");
      else if (d.normal >= 1 && d.promoPrice >= d.normal) bad(F.promoPrice, "Le prix promo doit être plus bas que le prix normal.");
    }
    if (!(d.stock >= 0 && d.stock <= 9999)) bad(F.stock, "Le stock est un nombre entier entre 0 et 9999 (0 = rupture).");
    if (editing.images.length > MAX_PHOTOS) bad(F.files, `Maximum ${MAX_PHOTOS} photos par produit.`);
    return errors;
  }

  function showErrors(errors) {
    $$("[aria-invalid]", dlg).forEach((el) => el.removeAttribute("aria-invalid"));
    const box = $("#fErrors");
    if (!errors.length) return (box.hidden = true);
    box.hidden = false;
    box.innerHTML = `<strong>À corriger :</strong><ul>${errors.map((e) => `<li>${esc(e.msg)}</li>`).join("")}</ul>`;
    errors.forEach((e) => e.field.setAttribute("aria-invalid", "true"));
    errors[0].field.focus();
  }

  $("#adForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const d = readForm();
    const errors = validate(d);
    showErrors(errors);
    if (errors.length) return;

    const product = {
      id: editing.id,
      name: d.name,
      category: d.category,
      price: d.promo ? d.promoPrice : d.normal,
      oldPrice: d.promo ? d.normal : null,
      badge: d.promo ? "sale" : d.isNew ? "new" : "",
      stock: d.stock,
      description: d.description,
      specs: d.specs,
      images: editing.images,
    };
    if (editing.isNew) products.unshift(product); // les nouveautés en premier
    else products[products.indexOf(editing.original)] = product;

    dlg.close();
    editing = null;
    scheduleSave();
    render();
    showToast("Produit enregistré (brouillon)", "success");
  });

  $("#adCancel").addEventListener("click", () => dlg.close());
  $("#adCancelX").addEventListener("click", () => dlg.close());
  $("#adDelete").addEventListener("click", () => {
    const p = editing.original;
    if (!p || !confirm(`Supprimer « ${p.name} » du catalogue ?`)) return;
    products.splice(products.indexOf(p), 1);
    dlg.close();
    scheduleSave();
    render();
  });
  dlg.addEventListener("close", () => {
    // libère les photos ajoutées mais non enregistrées
    if (editing) editing.images.filter((i) => i.blob && i.url.startsWith("blob:") && !inState(i)).forEach((i) => URL.revokeObjectURL(i.url));
    editing = null;
  });
  const inState = (img) => products.some((p) => p.images.some((i) => i.url === img.url));

  ["input", "change"].forEach((evt) =>
    $("#adForm").addEventListener(evt, (e) => {
      if (e.target === F.files) return;
      syncPromoUI();
      updatePreview();
    })
  );

  /* ---- aperçu de la carte produit, avec le vrai style du site */
  function updatePreview() {
    if (!editing) return;
    const d = readForm();
    const price = d.promo ? d.promoPrice : d.normal;
    const preview = {
      id: "apercu",
      name: d.name || "Nom du produit",
      category: d.category,
      categoryLabel: labelOf(d.category),
      price: Number.isFinite(price) ? price : 0,
      oldPrice: d.promo && d.normal > price ? d.normal : null,
      badge: d.promo ? "sale" : d.isNew ? "new" : "",
      stock: Number.isFinite(d.stock) ? d.stock : 0,
      description: d.description || "La description apparaît ici.",
      image: editing.images[0] ? editing.images[0].url : "",
    };
    const box = $("#fPreview");
    box.innerHTML = productCardHTML(preview);
    box.querySelectorAll("[data-add-to-cart]").forEach((b) => b.removeAttribute("data-add-to-cart"));
    box.querySelectorAll("a").forEach((a) => a.removeAttribute("href"));
    box.querySelectorAll("[data-animate]").forEach((el) => el.classList.add("is-visible"));
    box.inert = true;
  }

  /* ------------------------------------------------------------------ photos */
  const kb = (bytes) => (bytes < 1024 * 100 ? (bytes / 1024).toFixed(0) : Math.round(bytes / 1024)) + " Ko";

  function renderPhotos() {
    const ul = $("#fPhotos");
    ul.innerHTML = editing.images
      .map(
        (img, i) => `
      <li class="ad-photo" data-i="${i}">
        <img src="${esc(img.url)}" alt="" width="64" height="64">
        <div class="ad-photo-info">
          <strong>${i === 0 ? "Photo principale" : `Photo ${i + 1}`}</strong>
          <small>${img.blob ? `Nouvelle · ${kb(img.size)}` : "Déjà en ligne"}</small>
        </div>
        <div class="ad-photo-btns">
          <button type="button" class="ad-mini" data-photo="up" aria-label="Monter la photo ${i + 1}" ${i === 0 ? "disabled" : ""}>↑</button>
          <button type="button" class="ad-mini" data-photo="down" aria-label="Descendre la photo ${i + 1}" ${i === editing.images.length - 1 ? "disabled" : ""}>↓</button>
          <button type="button" class="ad-mini ad-mini-del" data-photo="del" aria-label="Retirer la photo ${i + 1}">✕</button>
        </div>
      </li>`
      )
      .join("");
    $("#fPhotoCount").textContent = `${editing.images.length} / ${MAX_PHOTOS}`;
    $("#fDrop").hidden = editing.images.length >= MAX_PHOTOS;
  }

  $("#fPhotos").addEventListener("click", (e) => {
    const b = e.target.closest("[data-photo]");
    if (!b) return;
    const i = Number(b.closest(".ad-photo").dataset.i);
    const arr = editing.images;
    if (b.dataset.photo === "del") arr.splice(i, 1);
    if (b.dataset.photo === "up" && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    if (b.dataset.photo === "down" && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
    renderPhotos();
    updatePreview();
    const keep = $(`#fPhotos [data-i="${Math.min(b.dataset.photo === "up" ? i - 1 : b.dataset.photo === "down" ? i + 1 : i, arr.length - 1)}"] [data-photo="${b.dataset.photo}"]`);
    (keep && !keep.disabled ? keep : $("#fFiles")).focus();
  });

  const rand = () => Math.random().toString(36).slice(2, 6);
  const canvasBlob = (canvas, type, q) => new Promise((resolve) => canvas.toBlob(resolve, type, q));

  async function loadBitmap(file) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch (err) {
      const url = URL.createObjectURL(file);
      try {
        const img = new Image();
        img.src = url;
        await img.decode();
        return img;
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  }

  /** Redimensionne (900 px max) et compresse en WebP (ou JPEG si le navigateur ne sait pas) ≈ 120 Ko */
  async function processImage(file) {
    if (file.size > 25 * 1024 * 1024) throw new Error("fichier trop lourd (25 Mo max)");
    const bmp = await loadBitmap(file);
    const w0 = bmp.width || bmp.naturalWidth, h0 = bmp.height || bmp.naturalHeight;
    const scale = Math.min(1, MAX_SIDE / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale)), h = Math.max(1, Math.round(h0 * scale));

    let canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();

    let type = "image/webp", ext = "webp", q = 0.82;
    let blob = await canvasBlob(canvas, type, q);
    if (!blob || blob.type !== "image/webp") {
      // navigateur sans WebP : JPEG sur fond blanc (pas de transparence en JPEG)
      const flat = document.createElement("canvas");
      flat.width = w;
      flat.height = h;
      const c2 = flat.getContext("2d");
      c2.fillStyle = "#fff";
      c2.fillRect(0, 0, w, h);
      c2.drawImage(canvas, 0, 0);
      canvas = flat;
      type = "image/jpeg";
      ext = "jpg";
      blob = await canvasBlob(canvas, type, q);
    }
    while (blob.size > TARGET_KB * 1024 && q > 0.5) {
      q -= 0.08;
      blob = await canvasBlob(canvas, type, q);
    }
    return { blob, ext };
  }

  async function addFiles(fileList) {
    const msg = $("#fPhotoMsg");
    let files = Array.from(fileList).filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(f.name));
    if (!files.length) {
      msg.textContent = "Aucune image reconnue. Utilise des photos JPG, PNG ou WebP.";
      return;
    }
    const room = MAX_PHOTOS - editing.images.length;
    const notes = [];
    if (files.length > room) {
      notes.push(`Maximum ${MAX_PHOTOS} photos : ${files.length - room} ignorée(s).`);
      files = files.slice(0, room);
    }
    for (const f of files) {
      try {
        msg.textContent = `Optimisation de « ${f.name} »…`;
        const { blob, ext } = await processImage(f);
        editing.images.push({ path: `images/products/${editing.id}-${rand()}.${ext}`, blob, url: URL.createObjectURL(blob), size: blob.size, name: f.name });
      } catch (err) {
        notes.push(`« ${f.name} » : impossible à lire (${err.message || "format non pris en charge, essaie JPG ou PNG"}).`);
      }
      renderPhotos();
      updatePreview();
    }
    msg.textContent = notes.join(" ");
  }

  F.files.addEventListener("change", async () => {
    await addFiles(F.files.files);
    F.files.value = "";
  });
  const drop = $("#fDrop");
  ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("is-over"); }));
  drop.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));

  /* ------------------------------------------------------------------ fichiers à publier */
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = () => { const d = new Date(); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`; };

  const buildProductsJs = () => PRODUCTS_HEADER + JSON.stringify(products.map(toPublic), null, 2) + ";\n";

  function buildSitemap() {
    const domain = String((window.SITE || {}).domain || "").replace(/\/$/, "");
    const today = new Date().toISOString().slice(0, 10);
    const pages = [["", "1.0"], ["shop.html", "0.9"], ["services.html", "0.7"], ["about.html", "0.5"], ["contact.html", "0.5"], ["legal.html", "0.3"]];
    const urls = pages.map(([p, prio]) => [`${domain}/${p}`, prio]);
    products.filter((p) => p.stock !== 0).forEach((p) => urls.push([`${domain}/product.html?id=${p.id}`, "0.8"]));
    const x = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map(([loc, prio]) => `  <url><loc>${x(loc)}</loc><lastmod>${today}</lastmod><priority>${prio}</priority></url>`).join("\n") + `\n</urlset>\n`;
  }

  const newPhotos = (onlyUnwritten) => products.flatMap((p) => p.images).filter((i) => i.blob && (!onlyUnwritten || !i.written));
  const uniqueByPath = (imgs) => [...new Map(imgs.map((i) => [i.path, i])).values()];

  function download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }

  const result = (html, ok = true) => {
    const box = $("#pubResult");
    box.hidden = false;
    box.className = "ad-result " + (ok ? "is-ok" : "is-error");
    box.innerHTML = html;
  };
  const NEXT_STEP = `<p><strong>Dernière étape :</strong> remets le site en ligne pour que tes clients voient les changements
    (Netlify → ton site → <em>Deploys</em> → glisse le dossier ou le ZIP du site).</p>`;

  /* ---- A. ZIP des fichiers modifiés */
  async function exportZip() {
    const files = [{ name: "data/products.js", data: buildProductsJs() }, { name: "sitemap.xml", data: buildSitemap() }];
    uniqueByPath(newPhotos(false)).forEach((i) => files.push({ name: i.path, data: i.blob }));
    const zip = await TSZip.build(files);
    download(zip, `techstore-mise-a-jour-${stamp()}.zip`);
    result(`<p><strong>ZIP téléchargé</strong> (${files.length} fichier${files.length > 1 ? "s" : ""}, ${kb(zip.size)}).</p>
      <ol><li>Ouvre le ZIP et copie son contenu <strong>dans le dossier du site</strong> (accepte de remplacer <code>data/products.js</code>).</li>
      <li>Mets le site en ligne.</li></ol>`);
  }

  /* ---- B. Site complet (utile depuis un téléphone : Netlify accepte un ZIP) */
  async function exportSiteZip() {
    if (location.protocol === "file:") throw new Error("Le site complet n’est disponible que lorsque le site est ouvert depuis Internet (ou un serveur), pas en double-cliquant sur le fichier.");
    const core = (window.TECHSTORE_SITE_FILES || []).filter((f) => f !== "data/products.js" && f !== "sitemap.xml");
    const photos = [...new Set(products.flatMap((p) => p.images.filter((i) => !i.blob).map((i) => i.path)))];
    const all = [...core, ...photos];
    const files = [], missingCore = [], missingPhotos = [];
    for (let i = 0; i < all.length; i++) {
      $("#pubProgress").textContent = `Préparation du site… ${i + 1} / ${all.length}`;
      try {
        const r = await fetch(all[i], { cache: "no-store" });
        if (!r.ok) throw new Error(r.status);
        files.push({ name: all[i], data: new Uint8Array(await r.arrayBuffer()) });
      } catch (err) {
        (core.includes(all[i]) ? missingCore : missingPhotos).push(all[i]);
      }
    }
    $("#pubProgress").textContent = "";
    if (missingCore.length) throw new Error("Fichiers du site introuvables : " + missingCore.slice(0, 4).join(", ") + (missingCore.length > 4 ? "…" : ""));
    files.push({ name: "data/products.js", data: buildProductsJs() }, { name: "sitemap.xml", data: buildSitemap() });
    uniqueByPath(newPhotos(false)).forEach((i) => files.push({ name: i.path, data: i.blob }));
    const zip = await TSZip.build(files);
    download(zip, `techstore-site-complet-${stamp()}.zip`);
    result(`<p><strong>Site complet téléchargé</strong> (${files.length} fichiers, ${kb(zip.size)}).</p>
      <p>Dans Netlify : ton site → <em>Deploys</em> → glisse ce ZIP : c’est tout.</p>` +
      (missingPhotos.length ? `<p class="ad-warn">Photos introuvables sur le site (ignorées) : ${esc(missingPhotos.join(", "))}</p>` : ""));
  }

  /* ---- C. Écriture directe dans le dossier du site (Chrome / Edge sur ordinateur) */
  async function getDir(root, parts) {
    let dir = root;
    for (const part of parts) dir = await dir.getDirectoryHandle(part, { create: true });
    return dir;
  }
  async function writeFile(root, path, data) {
    const parts = path.split("/");
    const name = parts.pop();
    const dir = await getDir(root, parts);
    const handle = await dir.getFileHandle(name, { create: true });
    const w = await handle.createWritable();
    await w.write(data);
    await w.close();
  }
  async function readText(root, path) {
    try {
      const parts = path.split("/");
      const name = parts.pop();
      let dir = root;
      for (const p of parts) dir = await dir.getDirectoryHandle(p);
      return await (await (await dir.getFileHandle(name)).getFile()).text();
    } catch (e) {
      return null;
    }
  }

  async function exportToFolder() {
    if (!window.showDirectoryPicker) throw new Error("Ton navigateur ne peut pas écrire dans un dossier. Utilise Chrome ou Edge sur ordinateur, ou l’option « ZIP ».");
    let handle = dirHandle;
    if (handle) {
      let perm = await handle.queryPermission({ mode: "readwrite" });
      if (perm !== "granted") perm = await handle.requestPermission({ mode: "readwrite" });
      if (perm !== "granted") handle = null;
    }
    if (!handle) {
      handle = await window.showDirectoryPicker({ mode: "readwrite", id: "techstore-site" });
      try { await handle.getFileHandle("index.html"); await handle.getDirectoryHandle("data"); }
      catch (e) { throw new Error("Ce dossier n’est pas celui du site (index.html et data introuvables). Choisis le dossier « techstore »."); }
      dirHandle = handle;
      kv("set", "dir", handle).catch(() => {});
    }
    const previous = await readText(handle, "data/products.js");
    if (previous) await writeFile(handle, "data/products.previous.js", previous); // copie de sécurité
    const photos = uniqueByPath(newPhotos(true));
    for (const img of photos) await writeFile(handle, img.path, img.blob);
    await writeFile(handle, "data/products.js", buildProductsJs());
    await writeFile(handle, "sitemap.xml", buildSitemap());
    products.forEach((p) => p.images.forEach((i) => i.blob && (i.written = true)));
    markPublished();
    scheduleSave();
    updateStatus();
    result(`<p><strong>Dossier mis à jour</strong> (« ${esc(handle.name)} ») : catalogue + ${photos.length} photo${photos.length > 1 ? "s" : ""}.
      L’ancien catalogue est gardé dans <code>data/products.previous.js</code>.</p>` + NEXT_STEP);
  }

  /* ------------------------------------------------------------------ fenêtre « Publier » */
  const pub = $("#adPublish");
  async function run(btn, fn) {
    btn.disabled = true;
    $("#pubResult").hidden = true;
    try { await fn(); }
    catch (err) { if (err && err.name !== "AbortError") result(`<p>${esc(err.message || String(err))}</p>`, false); }
    finally { btn.disabled = false; $("#pubProgress").textContent = ""; }
  }
  $("#adPublishBtn").addEventListener("click", () => {
    $("#pubResult").hidden = true;
    $("#pubFolder").hidden = !window.showDirectoryPicker;
    $("#pubFolderNo").hidden = !!window.showDirectoryPicker;
    $("#pubSite").disabled = location.protocol === "file:";
    $("#pubSiteNote").hidden = location.protocol !== "file:";
    $("#pubDirName").textContent = dirHandle ? `Dossier mémorisé : « ${dirHandle.name} »` : "";
    pub.showModal();
  });
  $("#pubClose").addEventListener("click", () => pub.close());
  $("#pubFolder").addEventListener("click", (e) => run(e.currentTarget, exportToFolder));
  $("#pubZip").addEventListener("click", (e) => run(e.currentTarget, exportZip));
  $("#pubSite").addEventListener("click", (e) => run(e.currentTarget, exportSiteZip));

  $("#adReset").addEventListener("click", () => {
    if (!confirm("Annuler toutes les modifications non publiées et revenir au catalogue du site ?")) return;
    products = fromRaw(window.TECHSTORE_PRODUCTS || []);
    markPublished();
    kv("del", "draft").catch(() => {});
    $("#adNotice").hidden = true;
    render();
  });

  window.addEventListener("beforeunload", (e) => {
    if (diffCount() > 0 && !window.__adTesting) { e.preventDefault(); e.returnValue = ""; }
  });

  /* ------------------------------------------------------------------ démarrage */
  async function init() {
    $("#adCat").insertAdjacentHTML("beforeend", CATEGORIES.map((c) => `<option value="${c.key}">${esc(c.label)}</option>`).join(""));
    F.cat.innerHTML = CATEGORIES.map((c) => `<option value="${c.key}">${esc(c.label)}</option>`).join("");

    const raw = window.TECHSTORE_PRODUCTS;
    if (!Array.isArray(raw)) {
      const n = $("#adNotice");
      n.hidden = false;
      n.className = "ad-notice is-error";
      n.innerHTML = "<strong>Le catalogue (data/products.js) est introuvable ou contient une erreur.</strong> Ouvre la console (F12) pour voir laquelle.";
      $("#adNew").disabled = true;
      return;
    }
    products = fromRaw(raw);
    markPublished();

    try {
      const draft = await kv("get", "draft");
      if (draft && Array.isArray(draft.products)) {
        const restored = draft.products.map((p) => ({
          ...p,
          images: p.images.map((i) => ({ path: i.path, blob: i.blob || undefined, size: i.size, written: i.written, url: i.blob ? URL.createObjectURL(i.blob) : i.path })),
        }));
        const before = products;
        products = restored;
        if (diffCount() === 0) { products = before; kv("del", "draft").catch(() => {}); }
        else {
          const n = $("#adNotice");
          n.hidden = false;
          n.className = "ad-notice";
          n.innerHTML = `Brouillon du ${new Date(draft.savedAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })} repris. Rien n’est publié tant que tu n’as pas cliqué sur « Publier ».`;
        }
      }
      const saved = await kv("get", "dir");
      if (saved && saved.kind === "directory") dirHandle = saved;
    } catch (e) {
      persistOK = false;
    }
    render();
  }

  init();
  window.TSAdmin = { get products() { return products; } }; // pour les tests
})();
