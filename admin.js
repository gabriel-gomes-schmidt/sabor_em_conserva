// Credenciais fixas (apenas para uso local - não seguro para produção)
const ADMIN_USER = 'gabrielg';
const ADMIN_PASS = '123456789';

// Storage keys
const KEY_PRODUCTS = 'products';
const KEY_ORDERS = 'orders';
const AUTH_FLAG = 'admin_auth';
let CURRENT_FILTER = 'todos';
let PROD_IMG_DATA_TEMP = null; // Data URL temporária ao escolher arquivo

// Utils
const fmtBRL = (n) => Number(n||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

function isAuthed() { return sessionStorage.getItem(AUTH_FLAG) === '1'; }
function setAuthed(v) { if (v) sessionStorage.setItem(AUTH_FLAG, '1'); else sessionStorage.removeItem(AUTH_FLAG); }

function loadProducts() {
  try {
    const raw = localStorage.getItem(KEY_PRODUCTS);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveProducts(arr) {
  localStorage.setItem(KEY_PRODUCTS, JSON.stringify(arr));
}
function loadOrders() {
  try {
    const raw = localStorage.getItem(KEY_ORDERS);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveOrders(arr) {
  localStorage.setItem(KEY_ORDERS, JSON.stringify(arr));
}

function toIntlPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.startsWith('55') ? digits : ('55' + digits);
}

function notifyWhats(order, newStatus) {
  const phoneIntl = toIntlPhone(order.customerPhone);
  const statusText = newStatus === 'recebido' ? 'recebido' : 'enviado';
  const lines = [];
  lines.push(`Olá, ${order.customerName}!`);
  lines.push(`Seu pedido foi ${statusText}.`);
  if (newStatus === 'enviado') lines.push('Obrigado pela compra!');
  const msg = encodeURIComponent(lines.join('\n'));
  const url = `https://wa.me/${phoneIntl}?text=${msg}`;
  window.open(url, '_blank');
}

function renderProductsTable() {
  const tbl = document.getElementById('productsTable');
  const items = loadProducts();
  if (items.length === 0) {
    tbl.innerHTML = '<tr><td class="muted-center">Nenhum produto cadastrado.</td></tr>';
    return;
  }
  const getImgSrc = (p) => p.imageData || p.imageUrl || '';
  tbl.innerHTML = `
    <thead>
      <tr><th>Foto</th><th>Nome</th><th>Descrição</th><th>Unidade</th><th>Preço</th><th>Ações</th></tr>
    </thead>
    <tbody>
      ${items.map(p => `
        <tr data-id="${p.id}">
          <td>${getImgSrc(p) ? `<img src="${getImgSrc(p)}" alt="${p.name}" style="width:46px;height:46px;object-fit:cover;border-radius:8px;border:1px solid #20263a;"/>` : ''}</td>
          <td>${p.name}</td>
          <td>${p.desc || ''}</td>
          <td>${p.unit || ''}</td>
          <td>${fmtBRL(p.price)}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn--ghost btn-edit">Editar</button>
              <button class="btn btn--ghost btn-del">Excluir</button>
            </div>
          </td>
        </tr>`).join('')}
    </tbody>`;

  tbl.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.closest('tr').dataset.id;
      const item = loadProducts().find(x => x.id === id);
      if (!item) return;
      document.getElementById('prodId').value = item.id;
      document.getElementById('prodName').value = item.name;
      document.getElementById('prodDesc').value = item.desc || '';
      document.getElementById('prodUnit').value = item.unit || '';
      document.getElementById('prodPrice').value = item.price;
      document.getElementById('prodImgUrl').value = item.imageUrl || '';
      const prev = document.getElementById('prodImgPreview');
      const src = item.imageData || item.imageUrl || '';
      if (src) { prev.src = src; prev.style.display = 'inline-block'; } else { prev.src=''; prev.style.display='none'; }
      PROD_IMG_DATA_TEMP = item.imageData || null;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  tbl.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.closest('tr').dataset.id;
      const arr = loadProducts().filter(x => x.id !== id);
      saveProducts(arr);
      renderProductsTable();
      alert('Produto excluído.');
    });
  });
}

function resetProductForm() {
  document.getElementById('prodId').value = '';
  document.getElementById('prodName').value = '';
  document.getElementById('prodDesc').value = '';
  document.getElementById('prodUnit').value = '';
  document.getElementById('prodPrice').value = '';
  document.getElementById('prodImgUrl').value = '';
  const prev = document.getElementById('prodImgPreview');
  prev.src=''; prev.style.display='none';
  const file = document.getElementById('prodImgFile');
  if (file) file.value = '';
  PROD_IMG_DATA_TEMP = null;
}

function setupProductForm() {
  document.getElementById('btnResetProd').addEventListener('click', resetProductForm);
  const fileInput = document.getElementById('prodImgFile');
  const urlInput = document.getElementById('prodImgUrl');
  const preview = document.getElementById('prodImgPreview');
  if (fileInput) fileInput.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) { PROD_IMG_DATA_TEMP = null; preview.src=''; preview.style.display='none'; return; }
    const reader = new FileReader();
    reader.onload = () => { PROD_IMG_DATA_TEMP = reader.result; preview.src = PROD_IMG_DATA_TEMP; preview.style.display='inline-block'; };
    reader.readAsDataURL(f);
  });
  if (urlInput) urlInput.addEventListener('input', () => {
    if (!PROD_IMG_DATA_TEMP) {
      const u = urlInput.value.trim();
      if (u) { preview.src = u; preview.style.display='inline-block'; } else { preview.src=''; preview.style.display='none'; }
    }
  });

  document.getElementById('productForm').addEventListener('submit', () => {
    const id = document.getElementById('prodId').value || uid();
    const name = document.getElementById('prodName').value.trim();
    const desc = document.getElementById('prodDesc').value.trim();
    const unit = document.getElementById('prodUnit').value.trim();
    const price = parseFloat(document.getElementById('prodPrice').value);
    const imageUrl = document.getElementById('prodImgUrl').value.trim();
    if (!name || isNaN(price)) { alert('Preencha nome e preço.'); return; }
    const arr = loadProducts();
    const idx = arr.findIndex(x => x.id === id);
    const obj = { id, name, desc, unit, price };
    // Salva imagem: se arquivo foi escolhido, usa imageData; senão, usa imageUrl
    if (PROD_IMG_DATA_TEMP) { obj.imageData = PROD_IMG_DATA_TEMP; obj.imageUrl = imageUrl || ''; }
    else if (imageUrl) { obj.imageUrl = imageUrl; obj.imageData = ''; }
    else { obj.imageUrl = obj.imageData = ''; }
    if (idx >= 0) arr[idx] = obj; else arr.push(obj);
    saveProducts(arr);
    renderProductsTable();
    resetProductForm();
    alert('Produto salvo!');
  });
}

function renderOrders() {
  const wrap = document.getElementById('ordersList');
  const all = loadOrders().sort((a,b) => b.createdAt - a.createdAt);
  const select = document.getElementById('filterStatus');
  CURRENT_FILTER = select ? (select.value || 'todos') : CURRENT_FILTER;
  const orders = CURRENT_FILTER === 'todos' ? all : all.filter(o => (o.status || 'novo') === CURRENT_FILTER);
  if (orders.length === 0) { wrap.innerHTML = '<p class="muted">Nenhum pedido ainda.</p>'; return; }
  wrap.innerHTML = orders.map((o) => {
    const items = o.items.map(it => `${it.qty}× ${it.name} (${it.unit || ''}) — ${fmtBRL(it.price * it.qty)}`).join('<br>');
    const addrParts = [];
    if (o.pickup) addrParts.push('Retirar na loja');
    if (o.address) addrParts.push(o.address);
    if (o.geo?.link) addrParts.push(o.geo.link);
    const addr = addrParts.join('<br>');
    const when = new Date(o.createdAt).toLocaleString('pt-BR');
    const status = o.status || 'novo';
    const statusClass = `status-badge status-${status}`;
    // Determine which actions to show given current status
    const showReceived = status !== 'recebido' && status !== 'enviado' && status !== 'finalizado';
    const showSent = status !== 'enviado' && status !== 'finalizado';
    const showFinal = status !== 'finalizado';

    const key = o.createdAt;
    return `<div class="order" style="margin-top:12px;" data-key="${key}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <input type="checkbox" class="order-select" data-key="${key}">
          <h3 style="margin:0;">Pedido de ${o.customerName}</h3>
          <div class="muted small">Tel: ${o.customerPhone || '-'}</div>
        </div>
        <span class="muted small">${when}</span>
      </div>
      <div class="order-list" style="margin-top:8px;">
        ${items}
      </div>
      <div class="summary__footer">
        <div class="total"><span>Total</span> <strong>${fmtBRL(o.total)}</strong> <span class="${statusClass}" style="margin-left:8px;">${status.toUpperCase()}</span></div>
        <div class="muted small">${addr || ''}</div>
      </div>
      <div class="actions" style="display:flex; gap:8px; margin-top:8px;">
        ${showReceived ? '<button class="btn btn--ghost btn-mark-received">Marcar como Recebido + Notificar</button>' : ''}
        ${showSent ? '<button class="btn btn--ghost btn-mark-sent">Marcar como Enviado + Notificar</button>' : ''}
        ${showFinal ? '<button class="btn btn--ghost btn-mark-finalized">Marcar como Finalizado</button>' : ''}
      </div>
    </div>`;
  }).join('');

  // Bind buttons
  wrap.querySelectorAll('.order').forEach(el => {
    const key = Number(el.dataset.key);
    const btnR = el.querySelector('.btn-mark-received');
    const btnS = el.querySelector('.btn-mark-sent');
    const btnF = el.querySelector('.btn-mark-finalized');
    if (btnR) btnR.addEventListener('click', () => {
      const arr = loadOrders();
      const idx = arr.findIndex(x => x.createdAt === key);
      const o = arr[idx]; if (!o) return;
      o.status = 'recebido';
      saveOrders(arr);
      renderOrders();
      if (o.customerPhone) notifyWhats(o, 'recebido');
    });
    if (btnS) btnS.addEventListener('click', () => {
      const arr = loadOrders();
      const idx = arr.findIndex(x => x.createdAt === key);
      const o = arr[idx]; if (!o) return;
      o.status = 'enviado';
      saveOrders(arr);
      renderOrders();
      if (o.customerPhone) notifyWhats(o, 'enviado');
    });
    if (btnF) btnF.addEventListener('click', () => {
      const arr = loadOrders();
      const idx = arr.findIndex(x => x.createdAt === key);
      const o = arr[idx]; if (!o) return;
      o.status = 'finalizado';
      saveOrders(arr);
      renderOrders();
    });
  });

  // Bind select all checkbox to current rendered list
  const selAll = document.getElementById('selectAllOrders');
  if (selAll) {
    selAll.addEventListener('change', () => {
      wrap.querySelectorAll('.order-select').forEach(cb => { cb.checked = selAll.checked; });
    }, { once: true });
  }
}

function switchTab(tab) {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('tab-products').style.display = tab === 'products' ? 'block' : 'none';
  document.getElementById('tab-orders').style.display = tab === 'orders' ? 'block' : 'none';
  if (tab === 'products') renderProductsTable(); else renderOrders();
}

function initPanel() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('panelSection').style.display = '';
  setupProductForm();
  switchTab('products');
  document.querySelectorAll('.tabs button').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)) );
  document.getElementById('btnLogout').addEventListener('click', () => { setAuthed(false); location.reload(); });
  const filterSel = document.getElementById('filterStatus');
  if (filterSel) filterSel.addEventListener('change', () => { CURRENT_FILTER = filterSel.value || 'todos'; renderOrders(); });
  const bulkBtn = document.getElementById('btnBulkFinalize');
  if (bulkBtn) bulkBtn.addEventListener('click', () => {
    const wrap = document.getElementById('ordersList');
    const keys = Array.from(wrap.querySelectorAll('.order-select:checked')).map(cb => Number(cb.dataset.key));
    if (keys.length === 0) { alert('Selecione ao menos um pedido.'); return; }
    const arr = loadOrders();
    let changed = 0;
    keys.forEach(k => {
      const idx = arr.findIndex(x => x.createdAt === k);
      if (idx >= 0) { arr[idx].status = 'finalizado'; changed++; }
    });
    if (changed > 0) { saveOrders(arr); renderOrders(); }
  });
  const btnDeleteFinalized = document.getElementById('btnDeleteFinalized');
  if (btnDeleteFinalized) btnDeleteFinalized.addEventListener('click', () => {
    const arr = loadOrders();
    const count = arr.filter(o => (o.status || 'novo') === 'finalizado').length;
    if (count === 0) { alert('Não há pedidos finalizados para apagar.'); return; }
    if (!confirm(`Apagar ${count} pedido(s) finalizado(s)? Esta ação não pode ser desfeita.`)) return;
    const kept = arr.filter(o => (o.status || 'novo') !== 'finalizado');
    saveOrders(kept);
    renderOrders();
  });
}

function initLogin() {
  document.getElementById('loginSection').style.display = '';
  document.getElementById('panelSection').style.display = 'none';
  const form = document.getElementById('loginForm');
  form.addEventListener('submit', () => {
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value;
    if (u === ADMIN_USER && p === ADMIN_PASS) {
      setAuthed(true);
      initPanel();
      // Abrir o site após login
      try { window.open('index.html', '_blank'); } catch {}
    } else {
      alert('Usuário ou senha inválidos.');
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  if (isAuthed()) initPanel(); else initLogin();
});
