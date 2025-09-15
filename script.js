const WHATSAPP_NUMBER = '5599999999999';

// Chaves de armazenamento
const KEY_PRODUCTS = 'products';
const KEY_ORDERS = 'orders';
const KEY_CUSTOMERS = 'customers';
const SESSION_CUSTOMER = 'customer_session';
const ADMIN_AUTH_FLAG = 'admin_auth';
const ADMIN_USER_INLINE = 'gabrielg';
const ADMIN_PASS_INLINE = '123456789';
const THEME_KEY = 'theme';

// Endereço da loja (edite aqui conforme necessário)
const STORE_ADDRESS = {
  cep: '00000-000',
  bairro: 'Centro',
  rua: 'Rua das Conservas',
  numero: '123',
  cidade: 'Sua Cidade',
  estado: 'UF',
  compl: 'Retirada no balcão',
  link: '' // opcional: ex. 'https://maps.google.com/?q=-12.34,-45.67'
};
let PREV_ADDRESS_SNAPSHOT = null;

// Lista padrão (fallback) caso não haja produtos cadastrados no admin
const DEFAULT_PRODUCTS = [
  { id: 'picles', name: 'Picles Mix', desc: 'Cenoura, pepino e couve-flor', price: 18.0, unit: '300g' },
  { id: 'pepino', name: 'Pepino em Conserva', desc: 'Crocante e saboroso', price: 16.0, unit: '300g' },
  { id: 'berinjela', name: 'Berinjela em Conserva', desc: 'Receita da casa', price: 22.0, unit: '350g' },
  { id: 'pimenta', name: 'Pimenta em Conserva', desc: 'Ardência equilibrada', price: 15.0, unit: '200g' },
  { id: 'tomate', name: 'Tomate Seco', desc: 'No azeite extra virgem', price: 28.0, unit: '250g' },
  { id: 'cebola', name: 'Cebola em Conserva', desc: 'Levemente adocicada', price: 17.0, unit: '300g' }
];

function loadProducts() {
  try {
    const raw = localStorage.getItem(KEY_PRODUCTS);
    if (!raw) return DEFAULT_PRODUCTS;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length ? arr : DEFAULT_PRODUCTS;
  } catch {
    return DEFAULT_PRODUCTS;
  }
}

let PRODUCTS = loadProducts();

const cart = new Map();
let geo = { lat: null, lng: null, link: null };
const fmtBRL = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ====== Autenticação simples do cliente (nome + senha) ======
function loadCustomers() {
  try {
    const raw = localStorage.getItem(KEY_CUSTOMERS);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveCustomers(arr) { localStorage.setItem(KEY_CUSTOMERS, JSON.stringify(arr)); }
function getSessionCustomer() {
  try { return JSON.parse(localStorage.getItem(SESSION_CUSTOMER) || 'null'); } catch { return null; }
}
function setSessionCustomer(obj) {
  if (obj) localStorage.setItem(SESSION_CUSTOMER, JSON.stringify(obj));
  else localStorage.removeItem(SESSION_CUSTOMER);
}
function registerCustomer(name, pass, phone) {
  name = (name||'').trim();
  if (!name || !pass) { alert('Informe nome e senha.'); return false; }
  const customers = loadCustomers();
  if (customers.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    alert('Este nome já está cadastrado.');
    return false;
  }
  customers.push({ name, pass, phone: (phone||'').trim() });
  saveCustomers(customers);
  setSessionCustomer({ name, phone: (phone||'').trim() });
  return true;
}
function loginCustomer(name, pass) {
  name = (name||'').trim();
  const customers = loadCustomers();
  const found = customers.find(c => c.name.toLowerCase() === name.toLowerCase() && c.pass === pass);
  if (!found) { alert('Nome ou senha incorretos.'); return false; }
  setSessionCustomer({ name: found.name, phone: found.phone || '' });
  return true;
}
function logoutCustomer() { setSessionCustomer(null); }

function refreshAuthUI() {
  const sess = getSessionCustomer();
  const authLogged = document.getElementById('authLogged');
  const authForms = document.getElementById('authForms');
  const authButtonsRow = document.getElementById('authButtonsRow');
  const headerWelcome = document.getElementById('authHeaderWelcome');
  const headerName = document.getElementById('authHeaderName');
  const btnLogoutTop = document.getElementById('btnLogoutTop');
  const btnOpenLoginTop = document.getElementById('btnOpenLoginTop');
  const btnOpenRegisterTop = document.getElementById('btnOpenRegisterTop');
  if (sess && sess.name) {
    if (authLogged) authLogged.style.display = '';
    if (authForms) authForms.style.display = 'none';
    if (authButtonsRow) authButtonsRow.style.display = 'none';
    const authNameEl = document.getElementById('authName');
    if (authNameEl) authNameEl.textContent = sess.name;
    // Header session UI
    if (headerWelcome && headerName && btnLogoutTop) {
      headerName.textContent = sess.name;
      headerWelcome.style.display = '';
      btnLogoutTop.style.display = '';
      if (btnOpenLoginTop) btnOpenLoginTop.style.display = 'none';
      if (btnOpenRegisterTop) btnOpenRegisterTop.style.display = 'none';
    }
  } else {
    if (authLogged) authLogged.style.display = 'none';
    if (authForms) authForms.style.display = '';
    if (authButtonsRow) authButtonsRow.style.display = '';
    // Header session UI
    if (headerWelcome && btnLogoutTop) {
      headerWelcome.style.display = 'none';
      btnLogoutTop.style.display = 'none';
      if (btnOpenLoginTop) btnOpenLoginTop.style.display = '';
      if (btnOpenRegisterTop) btnOpenRegisterTop.style.display = '';
    }
  }
}

function saveOrder(order) {
  try {
    const raw = localStorage.getItem(KEY_ORDERS);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(order);
    localStorage.setItem(KEY_ORDERS, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

function getOrderOrNull() {
  const sess = getSessionCustomer();
  const customerName = (sess?.name || '').trim();
  const customerPhone = (sess?.phone || '').trim();
  const pickup = !!document.getElementById('pickup')?.checked;
  // Novos campos de endereço
  const cep = document.getElementById('addrCep')?.value.trim() || '';
  const bairro = document.getElementById('addrBairro')?.value.trim() || '';
  const rua = document.getElementById('addrRua')?.value.trim() || '';
  const numero = document.getElementById('addrNumero')?.value.trim() || '';
  const cidade = document.getElementById('addrCidade')?.value.trim() || '';
  const estado = document.getElementById('addrEstado')?.value.trim() || '';
  const compl = document.getElementById('addrCompl')?.value.trim() || '';
  const parts = [
    rua && numero ? `${rua}, ${numero}` : rua || '',
    bairro,
    cidade && estado ? `${cidade} - ${estado}` : cidade || estado,
    cep ? `CEP ${cep}` : '',
    compl
  ].filter(Boolean);
  const customerAddress = parts.join(' | ');
  if (!customerName) { alert('Faça login na sua conta (Nome).'); return null; }
  if (!customerPhone) { alert('Informe seu telefone na sua conta.'); return null; }
  if (cart.size === 0) { alert('Selecione ao menos 1 item.'); return null; }
  const items = Array.from(cart.values()).map(({product, qty}) => ({
    id: product.id,
    name: product.name,
    unit: product.unit,
    price: product.price,
    qty
  }));
  const total = items.reduce((s, it) => s + it.price * it.qty, 0);
  return {
    customerName,
    customerPhone,
    address: customerAddress,
    pickup,
    geo: { ...geo },
    items,
    total,
    status: 'novo',
    createdAt: Date.now()
  };
}

function messageFromOrder(order) {
  let lines = [];
  lines.push('*Novo pedido* — Conservas da Casa');
  lines.push('');
  lines.push('*Cliente:* ' + order.customerName);
  if (order.customerPhone) lines.push('*Telefone:* ' + order.customerPhone);
  if (order.address) lines.push('*Endereço:* ' + order.address);
  if (order.geo && order.geo.link) lines.push('*Localização:* ' + order.geo.link);
  lines.push('');
  lines.push('*Itens:*');
  order.items.forEach(it => lines.push(`- ${it.qty}× ${it.name} (${it.unit || ''}) — ${fmtBRL(it.price * it.qty)}`));
  lines.push('');
  lines.push('*Total:* ' + fmtBRL(order.total));
  return lines.join('\n');
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  const imgSrc = (p) => (p.imageData || p.imageUrl || '').trim();
  grid.innerHTML = PRODUCTS.map((p, i) => `
    <div class="card" data-id="${p.id}" style="--i:${i}">
      ${imgSrc(p) ? `<img class="card__img" src="${imgSrc(p)}" alt="${p.name}">` : ''}
      <div>
        <h3 class="card__title">${p.name}</h3>
        <p class="card__desc">${p.desc} • ${p.unit}</p>
      </div>
      <div class="card__footer">
        <span class="price">${fmtBRL(p.price)}</span>
        <div class="qty">
          <button class="btn-minus" aria-label="Diminuir">−</button>
          <input class="qty-input" type="number" min="0" value="0" />
          <button class="btn-plus" aria-label="Aumentar">+</button>
        </div>
      </div>
    </div>`).join('');

  grid.querySelectorAll('.card').forEach(card => {
    const id = card.dataset.id;
    const p = PRODUCTS.find(x => x.id === id);
    const input = card.querySelector('.qty-input');
    const minus = card.querySelector('.btn-minus');
    const plus = card.querySelector('.btn-plus');
    const setQty = (q) => {
      q = Math.max(0, parseInt(q||0));
      input.value = q;
      if (q > 0) cart.set(id, { product: p, qty: q }); else cart.delete(id);
      renderSummary();
    };
    minus.addEventListener('click', () => setQty((+input.value||0) - 1));
    plus.addEventListener('click', () => setQty((+input.value||0) + 1));
    input.addEventListener('input', (e) => setQty(e.target.value));
  });
}

function renderSummary() {
  const list = document.getElementById('orderList');
  if (cart.size === 0) { list.classList.add('empty'); list.textContent = 'Nenhum item selecionado.'; document.getElementById('orderTotal').textContent = fmtBRL(0); return; }
  list.classList.remove('empty');
  let total = 0;
  list.innerHTML = Array.from(cart.values()).map(({product, qty}) => {
    const line = product.price * qty; total += line;
    return `<div class="order-item"><span>${qty}× ${product.name} (${product.unit})</span><strong>${fmtBRL(line)}</strong></div>`;
  }).join('');
  document.getElementById('orderTotal').textContent = fmtBRL(total);
}

// Mantido por compatibilidade, mas não mais usado diretamente
function buildMessage() {
  const order = getOrderOrNull();
  return order ? messageFromOrder(order) : null;
}

function submitOrderOnSite() {
  const order = getOrderOrNull();
  if (!order) return;
  saveOrder(order);
  alert('Pedido enviado com sucesso! Você pode visualizar no painel do administrador.');
  // Limpa carrinho e UI
  cart.clear();
  renderSummary();
  // Mantém dados do cliente e geo
}

function copySummary() {
  const order = getOrderOrNull();
  if (!order) return;
  const msg = messageFromOrder(order);
  navigator.clipboard.writeText(msg).then(() => alert('Resumo copiado!'));
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
    const resp = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    return data?.address || {};
  } catch (e) {
    return {};
  }
}

function setAddressFields(addr, link) {
  const by = (id) => document.getElementById(id);
  by('addrCep') && (by('addrCep').value = addr.postcode || by('addrCep').value);
  by('addrBairro') && (by('addrBairro').value = addr.suburb || addr.neighbourhood || addr.city_district || by('addrBairro').value);
  by('addrRua') && (by('addrRua').value = addr.road || addr.pedestrian || addr.path || by('addrRua').value);
  by('addrNumero') && (by('addrNumero').value = addr.house_number || by('addrNumero').value);
  by('addrCidade') && (by('addrCidade').value = addr.city || addr.town || addr.village || by('addrCidade').value);
  by('addrEstado') && (by('addrEstado').value = addr.state_code || addr.state || by('addrEstado').value);
  const compl = by('addrCompl');
  if (compl && link) {
    const tag = 'Localização: ' + link;
    if (!compl.value.includes(tag)) {
      compl.value = compl.value ? (compl.value + ' | ' + tag) : tag;
    }
  }
}

function getAddressSnapshot() {
  const g = (id) => document.getElementById(id)?.value || '';
  return {
    cep: g('addrCep'),
    bairro: g('addrBairro'),
    rua: g('addrRua'),
    numero: g('addrNumero'),
    cidade: g('addrCidade'),
    estado: g('addrEstado'),
    compl: g('addrCompl')
  };
}

function setAddressFromStore() {
  const s = STORE_ADDRESS;
  const set = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v || ''; el.disabled = true; } };
  set('addrCep', s.cep);
  set('addrBairro', s.bairro);
  set('addrRua', s.rua);
  set('addrNumero', s.numero);
  set('addrCidade', s.cidade);
  set('addrEstado', s.estado);
  const complVal = s.link ? `${s.compl} | Localização: ${s.link}` : s.compl;
  set('addrCompl', complVal);
}

function enableAddressEditing() {
  ['addrCep','addrBairro','addrRua','addrNumero','addrCidade','addrEstado','addrCompl'].forEach(id => {
    const el = document.getElementById(id); if (el) el.disabled = false;
  });
}

function updatePickupUI(checked) {
  const fieldsWrap = document.getElementById('addressFields');
  const storeDisp = document.getElementById('storeAddressDisplay');
  if (checked) {
    // Fill and lock
    setAddressFromStore();
    // Show only store street + number
    if (fieldsWrap) fieldsWrap.style.display = 'none';
    if (storeDisp) {
      const street = `${STORE_ADDRESS.rua || ''}`.trim();
      const num = `${STORE_ADDRESS.numero || ''}`.trim();
      storeDisp.textContent = [street, num && (', ' + num)].filter(Boolean).join('');
      storeDisp.style.display = '';
    }
  } else {
    // Restore previous and unlock
    enableAddressEditing();
    if (fieldsWrap) fieldsWrap.style.display = '';
    if (storeDisp) storeDisp.style.display = 'none';
    if (PREV_ADDRESS_SNAPSHOT) {
      const s = PREV_ADDRESS_SNAPSHOT;
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
      set('addrCep', s.cep);
      set('addrBairro', s.bairro);
      set('addrRua', s.rua);
      set('addrNumero', s.numero);
      set('addrCidade', s.cidade);
      set('addrEstado', s.estado);
      set('addrCompl', s.compl);
    }
  }
}

function setLocStatus(msg) { const s = document.getElementById('locStatus'); if (s) s.textContent = msg; }

async function lookupCEP(cep) {
  try {
    const clean = String(cep || '').replace(/\D/g, '');
    if (clean.length !== 8) return null;
    const resp = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.erro) return null;
    return data; // {logradouro, bairro, localidade, uf, cep, complemento}
  } catch { return null; }
}

function wireCEPAutoFill() {
  const cepInput = document.getElementById('addrCep');
  if (!cepInput) return;
  let timer = null;
  const handler = async () => {
    const data = await lookupCEP(cepInput.value);
    if (data) {
      const set = (id, v) => { const el = document.getElementById(id); if (el && !el.disabled && !el.value) el.value = v || ''; };
      set('addrRua', data.logradouro);
      set('addrBairro', data.bairro);
      set('addrCidade', data.localidade);
      set('addrEstado', data.uf);
      setLocStatus('Endereço preenchido pelo CEP.');
    }
  };
  ['input','blur'].forEach(evt => {
    cepInput.addEventListener(evt, () => {
      clearTimeout(timer);
      timer = setTimeout(handler, evt === 'blur' ? 0 : 400);
    });
  });
}

function locate() {
  if (!navigator.geolocation) { setLocStatus('Geolocalização não suportada pelo navegador.'); return; }
  setLocStatus('Obtendo localização…');
  navigator.geolocation.getCurrentPosition(async pos => {
    geo.lat = pos.coords.latitude; geo.lng = pos.coords.longitude;
    geo.link = `https://maps.google.com/?q=${geo.lat},${geo.lng}`;
    setLocStatus('Localização encontrada. Preenchendo endereço…');
    const addr = await reverseGeocode(geo.lat, geo.lng);
    setAddressFields(addr, geo.link);
    setLocStatus('Endereço preenchido automaticamente.');
  }, err => {
    let reason = 'Permissão negada ou origem não segura.';
    if (err && typeof err.code === 'number') {
      if (err.code === 1) reason = 'Permissão negada. Autorize o acesso à localização.';
      if (err.code === 2) reason = 'Posição indisponível.';
      if (err.code === 3) reason = 'Tempo esgotado para obter a posição.';
    }
    setLocStatus(`Não foi possível obter a localização. ${reason} Dica: abra o site em https:// ou localhost.`);
  }, { enableHighAccuracy: true, timeout: 12000 });
}

document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  // Theme toggle
  const root = document.documentElement;
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    root.setAttribute('data-theme', savedTheme);
  }
  const toggleBtn = document.getElementById('themeToggle');
  if (toggleBtn) toggleBtn.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  });
  // Auth modal wiring
  const btnOpenLogin = document.getElementById('btnOpenLogin');
  const btnOpenRegister = document.getElementById('btnOpenRegister');
  const btnOpenLoginTop = document.getElementById('btnOpenLoginTop');
  const btnOpenRegisterTop = document.getElementById('btnOpenRegisterTop');
  const modal = document.getElementById('modalAuth');
  const backdrop = document.getElementById('modalBackdrop');
  const modalClose = document.getElementById('modalClose');
  const title = document.getElementById('modalTitle');
  const rowPhone = document.getElementById('rowPhoneModal');
  const actionLogin = document.getElementById('btnActionLogin');
  const actionRegister = document.getElementById('btnActionRegister');
  const actionAdmin = document.getElementById('btnAdminLoginModal');
  const btnLogout = document.getElementById('btnLogoutCustomer');
  const headerWelcome = document.getElementById('authHeaderWelcome');
  const headerName = document.getElementById('authHeaderName');
  const btnLogoutTop = document.getElementById('btnLogoutTop');

  function openModal(mode) {
    // mode: 'login' | 'register'
    title.textContent = mode === 'login' ? 'Entrar' : 'Cadastrar';
    rowPhone.style.display = mode === 'login' ? 'none' : '';
    actionLogin.style.display = mode === 'login' ? '' : 'none';
    actionRegister.style.display = mode === 'register' ? '' : 'none';
    modal.style.display = backdrop.style.display = '';
  }
  function closeModal() {
    modal.style.display = backdrop.style.display = 'none';
  }
  if (btnOpenLogin) btnOpenLogin.addEventListener('click', () => openModal('login'));
  if (btnOpenRegister) btnOpenRegister.addEventListener('click', () => openModal('register'));
  if (btnOpenLoginTop) btnOpenLoginTop.addEventListener('click', () => openModal('login'));
  if (btnOpenRegisterTop) btnOpenRegisterTop.addEventListener('click', () => openModal('register'));
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);

  if (actionRegister) actionRegister.addEventListener('click', () => {
    const name = document.getElementById('regName').value;
    const pass = document.getElementById('regPass').value;
    const phone = document.getElementById('regPhone')?.value || '';
    if (registerCustomer(name, pass, phone)) { refreshAuthUI(); closeModal(); alert('Cadastro realizado!'); }
  });
  if (actionLogin) actionLogin.addEventListener('click', () => {
    const name = document.getElementById('regName').value;
    const pass = document.getElementById('regPass').value;
    if (loginCustomer(name, pass)) {
      const phoneTyped = (document.getElementById('regPhone')?.value || '').trim();
      if (phoneTyped) {
        const arr = loadCustomers();
        const idx = arr.findIndex(c => c.name.toLowerCase() === name.trim().toLowerCase());
        if (idx >= 0) { arr[idx].phone = phoneTyped; saveCustomers(arr); setSessionCustomer({ name: arr[idx].name, phone: phoneTyped }); }
      }
      refreshAuthUI();

  // Reflect session in header
  (function updateHeaderSession() {
    const sess = getSessionCustomer();
    if (headerWelcome && headerName && btnLogoutTop) {
      if (sess && sess.name) {
        headerName.textContent = sess.name;
        headerWelcome.style.display = '';
        btnLogoutTop.style.display = '';
        if (btnOpenLoginTop) btnOpenLoginTop.style.display = 'none';
        if (btnOpenRegisterTop) btnOpenRegisterTop.style.display = 'none';
      } else {
        headerWelcome.style.display = 'none';
        btnLogoutTop.style.display = 'none';
        if (btnOpenLoginTop) btnOpenLoginTop.style.display = '';
        if (btnOpenRegisterTop) btnOpenRegisterTop.style.display = '';
      }
    }
  })();
      closeModal();
    }
  });
  if (actionAdmin) actionAdmin.addEventListener('click', () => {
    const u = document.getElementById('regName').value.trim();
    const p = document.getElementById('regPass').value;
    if (u === ADMIN_USER_INLINE && p === ADMIN_PASS_INLINE) {
      try { sessionStorage.setItem(ADMIN_AUTH_FLAG, '1'); } catch {}
      window.location.href = 'admin.html';
    } else {
      alert('Usuário ou senha de administrador inválidos.');
    }
  });
  if (btnLogout) btnLogout.addEventListener('click', () => { logoutCustomer(); refreshAuthUI(); });
  if (btnLogoutTop) btnLogoutTop.addEventListener('click', () => { logoutCustomer(); refreshAuthUI(); });
  refreshAuthUI();

  const btnSubmit = document.getElementById('btnSubmitOrder');
  if (btnSubmit) btnSubmit.addEventListener('click', submitOrderOnSite);
  document.getElementById('btnCopy').addEventListener('click', copySummary);
  document.getElementById('btnLocate').addEventListener('click', locate);
  wireCEPAutoFill();

  // Toggle Retirar na loja
  const pickupCb = document.getElementById('pickup');
  if (pickupCb) {
    pickupCb.addEventListener('change', () => {
      if (pickupCb.checked) PREV_ADDRESS_SNAPSHOT = getAddressSnapshot();
      updatePickupUI(pickupCb.checked);
    });
    // Apply initial state on load
    if (pickupCb.checked) {
      PREV_ADDRESS_SNAPSHOT = getAddressSnapshot();
      updatePickupUI(true);
    }
  }

  // Inline admin login (footer)
  const adminForm = document.getElementById('adminLoginInline');
  if (adminForm) {
    adminForm.addEventListener('submit', () => {
      const u = document.getElementById('adminUserInline').value.trim();
      const p = document.getElementById('adminPassInline').value;
      if (u === ADMIN_USER_INLINE && p === ADMIN_PASS_INLINE) {
        try { sessionStorage.setItem(ADMIN_AUTH_FLAG, '1'); } catch {}
        window.location.href = 'admin.html';
      } else {
        alert('Usuário ou senha de administrador inválidos.');
      }
    });
  }
});
