(() => {
  'use strict';
  const S = window.SITE || {};
  const API = String(S.apiBase || '/api').replace(/\/$/, '');
  const $ = (id) => document.getElementById(id);
  const state = { access: sessionStorage.getItem('ts_admin_access') || '', refresh: sessionStorage.getItem('ts_admin_refresh') || '', user: null, role: 'none', products: [], categories: [], orders: [], staff: [] };
  const roles = { owner: 'Administrateur principal', stock: 'Gestionnaire de stock', orders: 'Gestionnaire des commandes', none: 'Compte sans rôle' };
  const statusLabels = { new: 'Nouvelle', confirmed: 'Confirmée', preparing: 'En préparation', shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée' };
  const fulfilmentLabels = { dakar_delivery: 'Livraison Dakar', regional_delivery: 'Livraison régionale', store_pickup: 'Retrait en boutique' };
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatMoney = (value) => `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
  const isOwner = () => state.role === 'owner';
  const isStock = () => state.role === 'stock';
  const canProducts = () => isOwner() || isStock();
  const canOrders = () => isOwner() || state.role === 'orders';
  function showNotice(el, message, type='info') { if (!el) return; el.textContent = message; el.className = `notice ${type}`; el.hidden = false; }
  function hideNotice(el) { if (el) el.hidden = true; }
  async function refreshAccess() {
    if (!state.refresh) return false;
    const response = await fetch(`${API}/auth/token/refresh/`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({refresh:state.refresh}) });
    if (!response.ok) return false;
    const data = await response.json(); state.access = data.access; state.refresh = data.refresh || state.refresh;
    sessionStorage.setItem('ts_admin_access', state.access); sessionStorage.setItem('ts_admin_refresh', state.refresh); return true;
  }
  async function api(path, options={}) {
    const headers = new Headers(options.headers || {});
    if (state.access) headers.set('Authorization', `Bearer ${state.access}`);
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type','application/json');
    headers.set('Accept','application/json');
    let response = await fetch(`${API}${path}`, {...options, headers});
    if (response.status === 401 && state.refresh && await refreshAccess()) {
      headers.set('Authorization', `Bearer ${state.access}`);
      response = await fetch(`${API}${path}`, {...options, headers});
    }
    if (!response.ok) {
      let message = `Erreur HTTP ${response.status}`;
      try { const body = await response.json(); message = Object.entries(body).map(([key,val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : typeof val === 'object' ? JSON.stringify(val) : val}`).join(' · ') || message; } catch (_) {}
      if (response.status === 401) {
        clearSession();
        showLogin();
        showNotice($('loginError'), 'Session expirée. Connecte-toi de nouveau.', 'error');
      }
      throw new Error(message);
    }
    if (response.status === 204) return null;
    return response.json();
  }
  function clearSession() { state.access=''; state.refresh=''; state.user=null; sessionStorage.removeItem('ts_admin_access'); sessionStorage.removeItem('ts_admin_refresh'); }
  function showLogin() { $('loginScreen').hidden=false; $('dashboard').hidden=true; }
  function showDashboard() { $('loginScreen').hidden=true; $('dashboard').hidden=false; $('userName').textContent=state.user?.username || 'Utilisateur'; $('userAvatar').textContent=(state.user?.username || 'TS').slice(0,2).toUpperCase(); $('userRole').textContent=roles[state.role] || 'Personnel'; document.querySelectorAll('.owner-only').forEach((el)=>el.hidden=!isOwner()); document.querySelectorAll('[data-view="products"]').forEach((el)=>el.hidden=!canProducts()); document.querySelectorAll('[data-view="orders"]').forEach((el)=>el.hidden=!canOrders()); }
  async function login(username,password) {
    const response = await fetch(`${API}/auth/token/`, {method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({username,password})});
    if (!response.ok) { let detail='Identifiants incorrects ou API indisponible.'; try { const d=await response.json(); if(d.detail) detail=d.detail; } catch(_){} throw new Error(detail); }
    const data=await response.json(); state.access=data.access; state.refresh=data.refresh; sessionStorage.setItem('ts_admin_access',state.access); sessionStorage.setItem('ts_admin_refresh',state.refresh);
    await loadCurrentUser(username);
  }
  async function loadCurrentUser(username) {
    // Django's admin user identity is resolved through a lightweight endpoint below.
    try { const data=await api('/auth/me/'); state.user=data; state.role=data.role || 'none'; }
    catch (error) { clearSession(); throw new Error('Le backend ne fournit pas encore le profil utilisateur (/api/auth/me/). Vérifie que la version complète du backend est installée.'); }
    if (!['owner','stock','orders'].includes(state.role)) { clearSession(); throw new Error('Ce compte n’a pas de rôle autorisé pour l’administration TECH STORE.'); }
    showDashboard(); await loadViewData();
  }
  function goView(name) {
    if (name==='staff' && !isOwner()) return;
    if (name==='products' && !canProducts()) return;
    if (name==='orders' && !canOrders()) return;
    document.querySelectorAll('.view').forEach((el)=>el.hidden=el.id!==`view-${name}`);
    document.querySelectorAll('.nav-item').forEach((el)=>el.classList.toggle('active',el.dataset.view===name));
    const titles={overview:'Vue d’ensemble',products:'Produits & stock',orders:'Commandes',staff:'Comptes employés'}; $('viewTitle').textContent=titles[name]||'Administration';
    if (name==='products') loadProducts().catch(showGlobalError); if(name==='orders') loadOrders().catch(showGlobalError); if(name==='staff') loadStaff().catch(showGlobalError);
  }
  function showGlobalError(error) { showNotice($('globalNotice'),error.message || String(error),'error'); }
  async function loadViewData() {
    hideNotice($('globalNotice'));
    const tasks=[loadCategories()]; if(canProducts()) tasks.push(loadProducts()); if(canOrders()) tasks.push(loadOrders()); if(isOwner()) tasks.push(loadStaff());
    await Promise.allSettled(tasks); await loadOverview();
    goView('overview');
  }
  async function loadCategories() {
    const data=await api('/categories/'); state.categories=Array.isArray(data)?data:(data.results||[]);
    $('productCategory').innerHTML=state.categories.filter(c=>c.active).map(c=>`<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');
  }
  async function loadProducts() {
    if(!canProducts()) return;
    const data=await api('/products/'); state.products=Array.isArray(data)?data:(data.results||[]); renderProducts(); await loadOverviewStats();
  }
  function renderProducts() {
    const query=($('productSearch').value||'').trim().toLowerCase(); const rows=state.products.filter(p=>`${p.name} ${p.sku} ${p.category_name||''}`.toLowerCase().includes(query)); $('productCount').textContent=`${rows.length} produit(s)`;
    if(!rows.length){$('productsTable').innerHTML='<div class="empty-state">Aucun produit correspondant. Ajoute ton premier produit ou modifie la recherche.</div>';return;}
    $('productsTable').innerHTML=`<table class="data-table"><thead><tr><th>Produit</th><th>Prix</th><th>Stock</th><th>Visibilité</th><th>Actions</th></tr></thead><tbody>${rows.map(p=>`<tr><td><div class="product-cell"><img class="product-thumb" src="${escapeHTML(p.image_url||'images/favicon-48.png')}" alt="" onerror="this.src='images/favicon-48.png'"><span><b>${escapeHTML(p.name)}</b><small>${escapeHTML(p.sku)} · ${escapeHTML(p.category_name||'')}</small></span></div></td><td><b>${formatMoney(p.price)}</b>${p.old_price?`<small class="muted"><br>${formatMoney(p.old_price)}</small>`:''}</td><td><span class="pill ${p.stock===0?'red':p.stock<4?'orange':'green'}">${Number(p.stock)} unité(s)</span></td><td><span class="pill ${p.active?'green':'red'}">${p.active?'Visible':'Masqué'}</span></td><td><div class="row-actions"><button class="small-btn" data-edit-product="${p.id}">Modifier</button><button class="small-btn" data-toggle-product="${p.id}" data-active="${p.active?'1':'0'}">${p.active?'Masquer':'Publier'}</button></div></td></tr>`).join('')}</tbody></table>`;
  }
  function openProduct(product=null) {
    const form=$('productForm'); form.reset(); form.elements.id.value=product?.id||''; $('productDialogTitle').textContent=product?'Modifier le produit':'Ajouter un produit';
    if(product){for(const key of ['name','sku','price','old_price','stock','badge','description']) if(form.elements[key]) form.elements[key].value=product[key]??''; form.elements.category.value=product.category; form.elements.active.checked=!!product.active; form.elements.specs_text.value=Array.isArray(product.specs)?product.specs.join('\n'):'';}
    hideNotice($('productFormNotice')); $('productDialog').showModal();
  }
  async function saveProduct(event) {
    event.preventDefault(); const form=event.currentTarget; const fd=new FormData(form); const id=fd.get('id');
    const payload=new FormData();
    ['name','sku','description','badge'].forEach(k=>payload.append(k,String(fd.get(k)||'')));
    ['category','price','stock'].forEach(k=>payload.append(k,String(fd.get(k)||'')));
    if(String(fd.get('old_price')||'').trim()) payload.append('old_price',String(fd.get('old_price')));
    payload.append('active',form.elements.active.checked?'true':'false'); payload.append('specs',JSON.stringify(String(fd.get('specs_text')||'').split('\n').map(s=>s.trim()).filter(Boolean)));
    const image=form.elements.image.files[0]; if(image) payload.append('image',image);
    const submit=form.querySelector('[type=submit]'); submit.disabled=true; submit.textContent='Enregistrement…';
    try { await api(`/products/${id?`${id}/`:''}`,{method:id?'PATCH':'POST',body:payload}); $('productDialog').close(); await loadProducts(); showNotice($('globalNotice'),'Produit enregistré. Les données du catalogue ont été mises à jour.','success'); }
    catch(error){showNotice($('productFormNotice'),error.message,'error');}
    finally{submit.disabled=false;submit.textContent='Enregistrer le produit';}
  }
  async function toggleProduct(id,active) { if(!confirm(active?'Masquer ce produit de la boutique ?':'Rendre ce produit visible sur la boutique ?'))return; await api(`/products/${id}/`,{method:'PATCH',body:JSON.stringify({active:!active})}); await loadProducts(); }
  async function loadOrders() {
    if(!canOrders()) return; const data=await api('/orders/'); state.orders=Array.isArray(data)?data:(data.results||[]); renderOrders(); await loadOverviewStats();
  }
  function renderOrders() {
    const q=($('orderSearch').value||'').toLowerCase().trim(), filter=$('orderStatusFilter').value;
    const rows=state.orders.filter(o=>(!filter||o.status===filter)&&`${o.reference} ${o.customer_name} ${o.phone} ${o.city} ${o.region}`.toLowerCase().includes(q));
    if(!rows.length){$('ordersTable').innerHTML='<div class="empty-state">Aucune commande à afficher pour ces filtres.</div>';return;}
    const transitions={new:['confirmed','cancelled'],confirmed:['preparing','cancelled'],preparing:['shipped','cancelled'],shipped:['delivered'],delivered:[],cancelled:[]};
    $('ordersTable').innerHTML=`<table class="data-table"><thead><tr><th>Référence / client</th><th>Réception</th><th>Total produits</th><th>Statut</th><th>Mettre à jour</th></tr></thead><tbody>${rows.map(o=>{const options=[o.status,...(transitions[o.status]||[])].filter((v,i,a)=>a.indexOf(v)===i);return `<tr><td><b>${escapeHTML(o.reference)}</b><small class="muted"><br>${escapeHTML(o.customer_name)} · ${escapeHTML(o.phone)}<br>${escapeHTML([o.city,o.region].filter(Boolean).join(', '))}</small><br><button class="small-btn" data-order-details="${o.id}">Détails</button></td><td>${escapeHTML(fulfilmentLabels[o.fulfilment]||o.fulfilment)}</td><td><b>${formatMoney(o.subtotal)}</b><small class="muted"><br>Livraison à confirmer</small></td><td><span class="pill ${o.status==='delivered'?'green':o.status==='cancelled'?'red':o.status==='new'?'orange':''}">${escapeHTML(statusLabels[o.status]||o.status)}</span></td><td><select class="status-select" data-order-status="${o.id}" ${options.length<2?'disabled':''}>${options.map(st=>`<option value="${st}" ${st===o.status?'selected':''}>${escapeHTML(statusLabels[st]||st)}</option>`).join('')}</select></td></tr>`}).join('')}</tbody></table>`;
  }
  async function updateOrderStatus(id,status) { if(!confirm(`Confirmer le changement de statut : ${statusLabels[status]} ?`)){await loadOrders();return;} try{await api(`/orders/${id}/`,{method:'PATCH',body:JSON.stringify({status})});await loadOrders();showNotice($('globalNotice'),'Statut de commande mis à jour.','success');}catch(error){showGlobalError(error);await loadOrders();} }
  async function loadStaff() {
    if(!isOwner())return; state.staff=await api('/users/'); renderStaff();
  }
  function renderStaff() {
    const rows=state.staff;if(!rows.length){$('staffTable').innerHTML='<div class="empty-state">Aucun compte utilisateur.</div>';return;}
    $('staffTable').innerHTML=`<table class="data-table"><thead><tr><th>Compte</th><th>Rôle</th><th>État</th><th>Action</th></tr></thead><tbody>${rows.map(u=>`<tr><td><b>${escapeHTML(u.username)}</b><small class="muted"><br>${escapeHTML(u.email||'Pas d’e-mail')}</small></td><td>${u.role==='owner'?escapeHTML(roles.owner):`<select class="status-select" data-user-role="${u.id}" ${!u.is_active?'disabled':''}><option value="stock" ${u.role==='stock'?'selected':''}>Stock</option><option value="orders" ${u.role==='orders'?'selected':''}>Commandes</option></select>`}</td><td><span class="pill ${u.is_active?'green':'red'}">${u.is_active?'Actif':'Désactivé'}</span></td><td>${u.id===state.user.id?'<span class="muted">Compte actuel</span>':`<button class="small-btn" data-toggle-user="${u.id}" data-active="${u.is_active?'1':'0'}">${u.is_active?'Désactiver':'Réactiver'}</button>`}</td></tr>`).join('')}</tbody></table>`;
  }
  async function createStaff(event) { event.preventDefault(); const form=event.currentTarget, fd=new FormData(form); const btn=form.querySelector('button[type=submit]'); btn.disabled=true; try{await api('/users/',{method:'POST',body:JSON.stringify({username:fd.get('username'),email:fd.get('email'),password:fd.get('password'),role:fd.get('role')})});form.reset();showNotice($('staffFormNotice'),'Compte employé créé. Transmets les identifiants de manière privée.','success');await loadStaff();}catch(error){showNotice($('staffFormNotice'),error.message,'error');}finally{btn.disabled=false;} }
  async function toggleStaff(id,active) { if(!confirm(active?'Désactiver ce compte ?':'Réactiver ce compte ?'))return; await api('/users/',{method:'PATCH',body:JSON.stringify({id,is_active:!active})}); await loadStaff(); }
  async function loadOverviewStats() {
    if(canProducts()){$('statProducts').textContent=state.products.filter(p=>p.active).length;$('statStock').textContent=state.products.filter(p=>p.active).reduce((sum,p)=>sum+Number(p.stock||0),0);$('statOut').textContent=state.products.filter(p=>p.active&&Number(p.stock)===0).length;}
    if(canOrders())$('statOrders').textContent=state.orders.filter(o=>['new','confirmed','preparing'].includes(o.status)).length;
  }
  async function loadOverview() {
    try { const tasks=[]; if(canProducts()&&!state.products.length)tasks.push(loadProducts()); if(canOrders()&&!state.orders.length)tasks.push(loadOrders()); await Promise.allSettled(tasks); await loadOverviewStats(); renderRecentOrders(); }
    catch(error){showGlobalError(error);}
  }
  function renderRecentOrders(){const rows=state.orders.slice(0,5);if(!rows.length){$('recentOrders').innerHTML='<div class="empty-state">Aucune commande enregistrée pour le moment.</div>';return;}$('recentOrders').innerHTML=`<table class="data-table"><thead><tr><th>Référence</th><th>Client</th><th>Montant</th><th>Statut</th></tr></thead><tbody>${rows.map(o=>`<tr><td><b>${escapeHTML(o.reference)}</b></td><td>${escapeHTML(o.customer_name)}</td><td>${formatMoney(o.subtotal)}</td><td><span class="pill">${escapeHTML(statusLabels[o.status]||o.status)}</span></td></tr>`).join('')}</tbody></table>`;}
  function openOrderDetails(id) {
    const order=state.orders.find(o=>String(o.id)===String(id)); if(!order)return;
    $('orderDialogTitle').textContent=order.reference;
    const items=Array.isArray(order.items)?order.items:[];
    $('orderDialogBody').innerHTML=`<div class="form-grid"><div><span class="eyebrow">CLIENT</span><p><b>${escapeHTML(order.customer_name)}</b><br>${escapeHTML(order.phone)}<br>${escapeHTML(order.address||'Adresse non renseignée')}<br>${escapeHTML([order.city,order.region].filter(Boolean).join(', '))}</p></div><div><span class="eyebrow">RÉCEPTION & PAIEMENT</span><p>${escapeHTML(fulfilmentLabels[order.fulfilment]||order.fulfilment)}<br>${escapeHTML(order.payment_method||'À confirmer')}<br>Statut : ${escapeHTML(statusLabels[order.status]||order.status)}</p></div><div><span class="eyebrow">ARTICLES</span><div class="table-wrap"><table class="data-table"><thead><tr><th>Produit</th><th>Qté</th><th>Prix unitaire</th><th>Total</th></tr></thead><tbody>${items.map(i=>`<tr><td>${escapeHTML(i.product_name)}<small class="muted"><br>${escapeHTML(i.sku)}</small></td><td>${Number(i.quantity)}</td><td>${formatMoney(i.unit_price)}</td><td>${formatMoney(i.line_total)}</td></tr>`).join('')}</tbody></table></div><p><b>Sous-total : ${formatMoney(order.subtotal)}</b><br><span class="muted">Frais de livraison à confirmer avec le client.</span></p></div>${order.customer_note?`<div><span class="eyebrow">NOTE</span><p>${escapeHTML(order.customer_note)}</p></div>`:''}</div>`;
    $('orderDialog').showModal();
  }
  async function updateStaffRole(id,role) { try { await api('/users/',{method:'PATCH',body:JSON.stringify({id,role})}); await loadStaff(); showNotice($('globalNotice'),'Rôle de l’employé mis à jour.','success'); } catch(error) { showGlobalError(error); await loadStaff(); } }
  document.addEventListener('click',async(event)=>{
    const nav=event.target.closest('[data-view]');if(nav){goView(nav.dataset.view);return;}
    const goto=event.target.closest('[data-goto]');if(goto){goView(goto.dataset.goto);return;}
    const edit=event.target.closest('[data-edit-product]');if(edit){openProduct(state.products.find(p=>String(p.id)===edit.dataset.editProduct));return;}
    const toggle=event.target.closest('[data-toggle-product]');if(toggle){try{await toggleProduct(toggle.dataset.toggleProduct,toggle.dataset.active==='1');}catch(e){showGlobalError(e);}return;}
    const staff=event.target.closest('[data-toggle-user]');if(staff){try{await toggleStaff(staff.dataset.toggleUser,staff.dataset.active==='1');}catch(e){showGlobalError(e);}return;}
    const details=event.target.closest('[data-order-details]');if(details){openOrderDetails(details.dataset.orderDetails);return;}
  });
  $('loginForm').addEventListener('submit',async(event)=>{event.preventDefault();hideNotice($('loginError'));const btn=event.currentTarget.querySelector('button');btn.disabled=true;try{await login($('loginUsername').value.trim(),$('loginPassword').value);}catch(error){showNotice($('loginError'),error.message,'error');}finally{btn.disabled=false;}});
  $('logoutBtn').addEventListener('click',()=>{clearSession();showLogin();}); $('addProductBtn').addEventListener('click',()=>openProduct()); $('productForm').addEventListener('submit',saveProduct); $('closeProductDialog').addEventListener('click',()=>$('productDialog').close()); $('cancelProductDialog').addEventListener('click',()=>$('productDialog').close());
  $('productSearch').addEventListener('input',renderProducts); $('orderSearch').addEventListener('input',renderOrders); $('orderStatusFilter').addEventListener('change',renderOrders); $('refreshOrders').addEventListener('click',()=>loadOrders().catch(showGlobalError)); $('refreshStaff').addEventListener('click',()=>loadStaff().catch(showGlobalError)); $('staffForm').addEventListener('submit',createStaff);
  $('ordersTable').addEventListener('change',(event)=>{const select=event.target.closest('[data-order-status]');if(select)updateOrderStatus(select.dataset.orderStatus,select.value);});
  $('staffTable').addEventListener('change',(event)=>{const select=event.target.closest('[data-user-role]');if(select)updateStaffRole(select.dataset.userRole,select.value);});
  $('closeOrderDialog').addEventListener('click',()=>$('orderDialog').close()); $('closeOrderDialogBottom').addEventListener('click',()=>$('orderDialog').close());
  (async()=>{if(!state.access){showLogin();return;}try{await loadCurrentUser('');}catch(error){clearSession();showLogin();showNotice($('loginError'),error.message,'error');}})();
})();
