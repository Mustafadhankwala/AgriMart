// ── NAVIGATION ────────────────────────────────────────────
function goTo(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + pageId)?.classList.add("active");
  document.querySelectorAll("#sidebar .side-menu li").forEach(li => {
    li.classList.toggle("active", li.dataset.page === pageId);
  });
}

document.querySelectorAll('#sidebar .side-menu li').forEach(li => {
  li.addEventListener('click', e => {
    e.preventDefault();
    if (li.dataset.page) goTo(li.dataset.page);
  });
});


// ── SIDEBAR TOGGLE ────────────────────────────────────────
document.getElementById('menuToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
});

// ── API / AUTH HELPERS ───────────────────────────────
const API_BASE_URL = "http://127.0.0.1:5000/api";
const API_ORIGIN = API_BASE_URL.replace("/api", "");
const AUTH_STORAGE_KEY = "agriAuthToken";

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY));
  } catch {
    return null;
  }
}

function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function getAuthHeaders() {
  const auth = getAuth();
  return auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
}

async function apiRequest(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  return await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body && !isFormData && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
  });
}

// ── AUTH GUARD ──────────────────────────────────
(function checkFarmerAuth() {
  const auth = getAuth();
  if (!auth?.token) {
    location.href = '../../login.html';
    return;
  }
  if (auth.user?.role !== 'farmer') {
    // Retailer or admin – redirect appropriately
    location.href = auth.user?.role === 'retailer'
      ? '../retailer/marketplace.html'
      : '../../login.html';
    return;
  }
  // Populate top-nav profile info
  const nameEl = document.querySelector('.pname');
  const roleEl = document.querySelector('.prole');
  if (nameEl) nameEl.textContent = auth.user.name || 'Farmer';
  if (roleEl) roleEl.textContent = 'Farmer · Verified ✓';
})();

function resolveImageUrl(image) {
  if (!image) return "";
  return image.startsWith("/uploads") ? `${API_ORIGIN}${image}` : image;
}

const formatCurrency = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function statusClass(status) {
  const map = {
    pending: 'badge-pending',
    accepted: 'badge-process',
    shipped: 'badge-process',
    delivered: 'badge-completed',
    cancelled: 'badge-cancelled',
  };
  return map[status] || 'badge-inactive';
}

function getCategoryIcon(category) {
  const icons = {
    grains: '🌾',
    vegetables: '🥬',
    fruits: '🍎',
    dairy: '🧀',
  };
  return icons[category?.toLowerCase()] || '🥕';
}

function buildProductCardHtml(product) {
  const icon = getCategoryIcon(product.category);
  const isOutOfStock = Number(product.quantity) <= 0;
  return `<div class="product-card">
        <div class="product-thumb">${product.image ? `<img src="${resolveImageUrl(product.image)}" alt="${product.name}">` : icon}</div>
        <div class="product-info">
          <div class="product-name">${product.name}</div>
          <div class="product-price">₹${Number(product.price).toLocaleString('en-IN')}/${product.unit || 'kg'}</div>
          <div class="product-stock" style="${isOutOfStock ? 'color:var(--red);' : ''}">
            ${isOutOfStock ? '<span data-i18n="stat_out_stock">Out of Stock</span>' : `<span data-i18n="lbl_stock_count">Stock:</span> ${product.quantity} ${product.unit || 'kg'}`}
          </div>
          <div class="product-actions">
            <button class="btn-sm edit"><i class='bx bx-edit'></i> <span data-i18n="btn_edit_sm">Edit</span></button>
            <button class="btn-sm del"><i class='bx bx-trash'></i></button>
          </div>
        </div>
      </div>`;
}

async function loadFarmerProducts() {
  const productGrid = document.querySelector('.product-grid');
  if (!productGrid) return;

  const auth = getAuth();
  if (!auth?.user?._id) return;

  productGrid.innerHTML = '<div style="padding:20px;color:#888;" data-i18n="state_loading_products">Loading products...</div>';
  if (typeof applyTranslations === 'function') applyTranslations(localStorage.getItem('agriLang') || 'en');

  try {
    const response = await apiRequest(`/products?limit=50&farmer=${auth.user._id}`);
    if (!response.ok) {
      productGrid.innerHTML = '<div style="padding:20px;color:#ef4444;" data-i18n="state_failed_load">Failed to load products.</div>';
      if (typeof applyTranslations === 'function') applyTranslations(localStorage.getItem('agriLang') || 'en');
      return;
    }
    const payload = await response.json();
    const products = payload.data || [];

    // Update My Store Stats
    const totalEl = document.getElementById('storeTotalProducts');
    if (totalEl) totalEl.textContent = products.length;

    const outOfStockEl = document.getElementById('storeOutOfStock');
    if (outOfStockEl) outOfStockEl.textContent = products.filter(p => Number(p.quantity) <= 0).length;

    const ratingEl = document.getElementById('storeRating');
    if (ratingEl) ratingEl.textContent = products.length > 0 ? '4.8★' : '0.0★';

    if (!products.length) {
      productGrid.innerHTML = '<div style="padding:20px;color:#888;" data-i18n="state_no_products">No products listed yet. Click “Add Product” to get started.</div>';
      if (typeof applyTranslations === 'function') applyTranslations(localStorage.getItem('agriLang') || 'en');
      return;
    }

    productGrid.innerHTML = products.map((p, i) => buildProductCardHtml(p, i)).join('');
    if (typeof applyTranslations === 'function') applyTranslations(localStorage.getItem('agriLang') || 'en');
    attachProductCardListeners(productGrid, products);
  } catch (error) {
    console.error('Unable to load farmer products', error);
    productGrid.innerHTML = '<div style="padding:20px;color:#ef4444;" data-i18n="state_failed_load">Error loading products.</div>';
    if (typeof applyTranslations === 'function') applyTranslations(localStorage.getItem('agriLang') || 'en');
  }
}

function attachProductCardListeners(grid, products) {
  grid.querySelectorAll('.btn-sm.edit').forEach((btn, i) => {
    btn.addEventListener('click', () => openEditModal(products[i]));
  });
  grid.querySelectorAll('.btn-sm.del').forEach((btn, i) => {
    btn.addEventListener('click', () => deleteProduct(products[i]._id, btn.closest('.product-card')));
  });
}

async function loadFarmerOrders() {
  // Stats are loaded by loadFarmerDashboardAnalytics(); this is kept for compatibility
  // but dashboard analytics already covers order counts.
}

// ── EDIT PRODUCT ───────────────────────────────────
let editingProductId = null;

function openEditModal(product) {
  editingProductId = product._id;
  const modal = document.getElementById('editProductModal');
  if (!modal) return;
  document.getElementById('editProductName').value = product.name || '';
  document.getElementById('editProductCategory').value = product.category || 'Grains';
  document.getElementById('editProductPrice').value = product.price || '';
  document.getElementById('editProductQuantity').value = product.quantity || '';
  document.getElementById('editProductDescription').value = product.description || '';
  modal.classList.add('open');
}

async function submitEditProduct(event) {
  event.preventDefault();
  if (!editingProductId) return;

  const name = document.getElementById('editProductName')?.value.trim();
  const category = document.getElementById('editProductCategory')?.value;
  const price = Number(document.getElementById('editProductPrice')?.value);
  const quantity = Number(document.getElementById('editProductQuantity')?.value);
  const description = document.getElementById('editProductDescription')?.value.trim();
  const imageFile = document.getElementById('editProductImage')?.files?.[0];

  if (!name || !category || !price || !quantity) {
    return alert('Please complete all required fields.');
  }

  const btn = event.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const payload = new FormData();
  payload.append('name', name);
  payload.append('category', category);
  payload.append('price', price);
  payload.append('quantity', quantity);
  payload.append('unit', 'kg');
  payload.append('description', description || '');
  if (imageFile) payload.append('image', imageFile);

  try {
    const response = await apiRequest(`/products/${editingProductId}`, {
      method: 'PUT',
      body: payload,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      alert(result?.message || 'Unable to update product.');
      return;
    }
    document.getElementById('editProductModal')?.classList.remove('open');
    showFarmerToast('Product updated successfully.');
    await loadFarmerProducts();
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

let productToDelete = null;

function deleteProduct(productId, cardEl) {
  productToDelete = { id: productId, el: cardEl };
  document.getElementById('deleteConfirmModal')?.classList.add('open');
}

document.getElementById('confirmDeleteBtn')?.addEventListener('click', async () => {
  if (!productToDelete) return;
  const { id: productId, el: cardEl, isMember } = productToDelete;
  const btn = document.getElementById('confirmDeleteBtn');
  const modal = document.getElementById('deleteConfirmModal');
  const heading = modal?.querySelector('h3');
  const msg = modal?.querySelector('p');

  btn.disabled = true;
  btn.textContent = 'Removing...';

  try {
    if (isMember) {
      const response = await apiRequest(`/team/${productId}`, { method: 'DELETE' });
      if (!response.ok) {
        showFarmerToast('Unable to remove team member.');
        return;
      }
      modal?.classList.remove('open');
      showFarmerToast('Team member removed.');
      loadTeamMembers();
    } else {
      const response = await apiRequest(`/products/${productId}`, { method: 'DELETE' });
      if (!response.ok) {
        alert('Unable to delete product.');
        return;
      }
      cardEl?.remove();
      modal?.classList.remove('open');
      showFarmerToast('Product deleted successfully.');
      await loadFarmerProducts();
    }
  } catch (e) {
    console.error('Delete failed', e);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Yes, Delete';
    // Restore modal defaults
    if (heading) heading.textContent = 'Delete Product?';
    if (msg) msg.textContent = 'This action cannot be undone. Are you sure you want to remove this item from your store?';
    productToDelete = null;
  }
});

function showFarmerToast(msg) {
  let toast = document.querySelector('.farmer-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'farmer-toast';
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#2d6a4f;color:#fff;padding:12px 20px;border-radius:8px;font-weight:600;z-index:9999;box-shadow:0 4px 14px rgba(0,0,0,.18);transition:opacity .3s;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ── ORDER STATUS UPDATE ────────────────────────────
async function updateOrderStatus(orderId, newStatus, btnEl) {
  btnEl.disabled = true;
  btnEl.textContent = 'Updating...';
  try {
    const response = await apiRequest(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: { status: newStatus },
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      alert(result?.message || 'Unable to update status.');
      return;
    }
    showFarmerToast(`Order status updated to "${newStatus}".`);
    await loadFarmerDashboardAnalytics();
  } finally {
    btnEl.disabled = false;
  }
}

function renderMonthlySales(monthlySales = []) {
  const chart = document.getElementById('monthlySalesChart');
  if (!chart) return;

  if (!monthlySales.length) {
    chart.innerHTML = '<div class="empty-analytics">No sales data yet.</div>';
    return;
  }

  const maxRevenue = Math.max(...monthlySales.map(item => item.revenue), 1);
  chart.innerHTML = monthlySales.map((item, index) => {
    const height = Math.max((item.revenue / maxRevenue) * 100, item.revenue ? 8 : 2);
    return `<div class="bar-col">
      <div class="bar ${index % 2 ? 'gold' : ''}" style="height:${height}%" data-val="${formatCurrency(item.revenue)}"></div>
      <span class="bar-label">${item.label}</span>
    </div>`;
  }).join('');
}

function renderStatusDistribution(distribution = {}) {
  const chart = document.getElementById('orderStatusChart');
  if (!chart) return;

  const statuses = ['pending', 'accepted', 'shipped', 'delivered', 'cancelled'];
  const total = statuses.reduce((sum, status) => sum + Number(distribution[status] || 0), 0);

  if (!total) {
    chart.innerHTML = '<div class="empty-analytics">No orders yet.</div>';
    return;
  }

  chart.innerHTML = statuses.map(status => {
    const count = Number(distribution[status] || 0);
    const width = total ? (count / total) * 100 : 0;
    return `<div class="status-row">
      <span>${status}</span>
      <div class="status-track"><div class="status-fill ${status}" style="width:${width}%"></div></div>
      <strong>${count}</strong>
    </div>`;
  }).join('');
}

function renderLowStock(products = []) {
  const list = document.getElementById('lowStockList');
  if (!list) return;

  if (!products.length) {
    list.innerHTML = '<div class="empty-analytics">No low stock products.</div>';
    return;
  }

  list.innerHTML = products.map(product => `<div class="analytics-row">
    <div class="analytics-main">
      <strong>${product.name}</strong>
      <span>${product.category || 'Product'} · ${formatCurrency(product.price)}/${product.unit || 'kg'}</span>
    </div>
    <div class="analytics-value">${product.quantity} ${product.unit || 'kg'}</div>
  </div>`).join('');
}

function renderRecentOrders(orders = []) {
  const table = document.getElementById('farmerRecentOrders');
  const count = document.getElementById('recentOrderCount');
  if (!table) return;

  if (count) {
    count.innerHTML = `<span id="recentOrderCountVal">${orders.length}</span> <span data-i18n="lbl_orders_count">orders</span>`;
  }

  if (!orders.length) {
    table.innerHTML = '<tr><td colspan="6" data-i18n="state_no_orders">No orders received yet.</td></tr>';
    if (typeof applyTranslations === 'function') applyTranslations(localStorage.getItem('agriLang') || 'en');
    return;
  }

  const NEXT_STATUS = { pending: 'accepted', accepted: 'shipped', shipped: 'delivered' };

  table.innerHTML = orders.map(order => {
    const next = NEXT_STATUS[order.orderStatus];
    let actionBtn = '';
    if (order.orderStatus === 'pending') {
      actionBtn = `
        <div style="display:flex; gap:5px;">
          <button class="btn-sm edit" style="padding:4px 8px;" onclick="updateOrderStatus('${order._id}','accepted',this)">Accept</button>
          <button class="btn-sm del" style="padding:4px 8px;" onclick="updateOrderStatus('${order._id}','cancelled',this)">Cancel</button>
        </div>`;
    } else if (next) {
      actionBtn = `<button class="btn-sm edit" onclick="updateOrderStatus('${order._id}','${next}',this)">Mark ${next}</button>`;
    } else {
      actionBtn = `<span style="color:#22c55e;font-size:12px;">Done</span>`;
    }
    return `<tr>
      <td>${order.product?.name || 'Deleted product'}</td>
      <td>${order.retailer?.name || 'Retailer'}</td>
      <td>${order.quantity} ${order.product?.unit || 'kg'}</td>
      <td>${formatCurrency(order.totalPrice)}</td>
      <td><span class="badge-status ${statusClass(order.orderStatus)}" data-i18n="sub_${order.orderStatus}">${order.orderStatus}</span></td>
      <td>${actionBtn}</td>
    </tr>`;
  }).join('');
  if (typeof applyTranslations === 'function') applyTranslations(localStorage.getItem('agriLang') || 'en');
}

function renderTopProducts(products = []) {
  const list = document.getElementById('topProductsList');
  if (!list) return;

  if (!products.length) {
    list.innerHTML = '<div class="empty-analytics" data-i18n="state_no_top_products">No top products yet. Delivered or accepted orders will appear here.</div>';
    if (typeof applyTranslations === 'function') applyTranslations(localStorage.getItem('agriLang') || 'en');
    return;
  }

  list.innerHTML = products.map(product => `<div class="analytics-row">
    <div class="analytics-main">
      <strong>${product.name}</strong>
      <span>${product.orderCount} orders · ${product.totalQuantity} ${product.unit || 'kg'} sold</span>
    </div>
    <div class="analytics-value">${formatCurrency(product.totalRevenue)}</div>
  </div>`).join('');
  if (typeof applyTranslations === 'function') applyTranslations(localStorage.getItem('agriLang') || 'en');
}

async function loadFarmerDashboardAnalytics() {
  try {
    const [statsResponse, ordersResponse, topProductsResponse] = await Promise.all([
      apiRequest('/dashboard/farmer/stats'),
      apiRequest('/dashboard/farmer/recent-orders?limit=5'),
      apiRequest('/dashboard/farmer/top-products?limit=10'),
    ]);

    if (!statsResponse.ok || !ordersResponse.ok || !topProductsResponse.ok) {
      throw new Error('Unable to load dashboard analytics.');
    }

    const statsPayload = await statsResponse.json();
    const ordersPayload = await ordersResponse.json();
    const topProductsPayload = await topProductsResponse.json();
    const stats = statsPayload.data || {};

    // Dashboard View Population
    if (document.getElementById('page-dashboard')) {
      document.getElementById('dashTotalOrders') && (document.getElementById('dashTotalOrders').textContent = Number(stats.totalOrders || 0).toLocaleString('en-IN'));
      document.getElementById('dashTotalRevenue') && (document.getElementById('dashTotalRevenue').textContent = formatCurrency(stats.totalRevenue));
      document.getElementById('dashDeliveredOrders') && (document.getElementById('dashDeliveredOrders').textContent = Number(stats.deliveredOrders || 0).toLocaleString('en-IN'));
      document.getElementById('dashTotalProducts') && (document.getElementById('dashTotalProducts').textContent = Number(stats.totalProducts || 0).toLocaleString('en-IN'));

      const pendingEl = document.getElementById('dashPendingOrders');
      if (pendingEl) pendingEl.textContent = stats.pendingOrders || 0;

      const lowStockEl = document.getElementById('dashLowStockCount');
      if (lowStockEl) lowStockEl.textContent = stats.lowStockCount || 0;

      const thresholdEl = document.getElementById('lowStockThreshold');
      if (thresholdEl) thresholdEl.innerHTML = `<span data-i18n="sub_threshold">Threshold</span> ${stats.lowStockThreshold}`;

      renderMonthlySales(stats.monthlySales || []);
      renderStatusDistribution(stats.statusDistribution || {});
      renderLowStock(stats.lowStockProducts || []);
      renderRecentOrders(ordersPayload.data || []);
      renderTopProducts(topProductsPayload.data || []);
    }

    // Analytics View Population
    renderAnalyticsTab(stats, topProductsPayload.data || []);

  } catch (error) {
    console.error('Dashboard analytics failed', error);
  }
}

function renderAnalyticsTab(stats, topProducts) {
  // Stats Cards
  const revEl = document.getElementById('analyticsRevenue');
  if (revEl) revEl.textContent = formatCurrency(stats.totalRevenue);

  const ordEl = document.getElementById('analyticsOrders');
  if (ordEl) ordEl.textContent = Number(stats.totalOrders || 0).toLocaleString('en-IN');

  const satEl = document.getElementById('analyticsSatisfaction');
  if (satEl) satEl.textContent = '94%'; // Simulated for now or could be stats.satisfaction

  const retEl = document.getElementById('analyticsReturnRate');
  if (retEl) retEl.textContent = '1.2%'; // Simulated for now

  // Charts
  const revChart = document.getElementById('analyticsRevenueChart');
  if (revChart) {
    const monthlySales = stats.monthlySales || [];
    if (!monthlySales.length) {
      revChart.innerHTML = '<div class="empty-analytics">No sales data yet.</div>';
    } else {
      const maxRevenue = Math.max(...monthlySales.map(item => item.revenue), 1);
      revChart.innerHTML = monthlySales.map((item, index) => {
        const height = Math.max((item.revenue / maxRevenue) * 100, item.revenue ? 8 : 2);
        return `<div class="bar-col">
          <div class="bar ${index % 2 ? 'gold' : ''}" style="height:${height}%" data-val="${formatCurrency(item.revenue)}"></div>
          <span class="bar-label">${item.label}</span>
        </div>`;
      }).join('');
    }
  }

  const catChart = document.getElementById('analyticsCategoryChart');
  if (catChart) {
    // Generate simple breakdown if data exists, otherwise simulated
    catChart.innerHTML = `
      <div class="donut-wrap">
        <svg class="donut-svg" width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" stroke-width="18"/>
          <circle cx="60" cy="60" r="50" fill="none" stroke="var(--green)" stroke-width="18" stroke-dasharray="188 126" stroke-dashoffset="25" transform="rotate(-90 60 60)"/>
        </svg>
        <div class="donut-legend">
          <div class="legend-item"><span class="legend-dot" style="background:var(--green)"></span>Grains — 100%</div>
        </div>
      </div>
    `;
  }

  // Top Products List
  const topList = document.getElementById('analyticsTopProductsContainer');
  if (topList) {
    if (!topProducts.length) {
      topList.innerHTML = '<div class="empty-analytics">No products sold yet.</div>';
    } else {
      const maxRev = Math.max(...topProducts.map(p => p.totalRevenue), 1);
      topList.innerHTML = `<div style="display:flex;flex-direction:column;gap:16px;">
        ${topProducts.map(p => {
        const perc = (p.totalRevenue / maxRev) * 100;
        return `
            <div>
              <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px;">
                <span>${p.name}</span><span style="color:var(--green);font-weight:700;">${formatCurrency(p.totalRevenue)}</span>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width:${perc}%"></div></div>
            </div>
          `;
      }).join('')}
      </div>`;
    }
  }
}

async function submitAddProduct(event) {
  event.preventDefault();
  const name = document.getElementById('productName')?.value.trim();
  const category = document.getElementById('productCategory')?.value;
  const price = Number(document.getElementById('productPrice')?.value);
  const quantity = Number(document.getElementById('productQuantity')?.value);
  const description = document.getElementById('productDescription')?.value.trim();
  const image = document.getElementById('productImage')?.files?.[0];

  if (!name || !category || !price || !quantity) {
    return alert('Please complete all required product fields.');
  }

  if (image && !image.type.startsWith('image/')) {
    return alert('Please select a valid image file.');
  }

  const payload = new FormData();
  payload.append('name', name);
  payload.append('category', category);
  payload.append('price', price);
  payload.append('quantity', quantity);
  payload.append('unit', 'kg');
  payload.append('description', description || '');
  if (image) payload.append('image', image);

  const response = await apiRequest('/products', {
    method: 'POST',
    body: payload,
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      alert('You must be logged in as a farmer to upload products.');
      return location.href = '/login.html';
    }
    return alert(result?.message || 'Unable to upload product.');
  }

  const modal = document.getElementById('addProductModal');
  modal?.classList.remove('open');
  document.getElementById('addProductForm')?.reset();
  const preview = document.getElementById('productImagePreview');
  if (preview) preview.textContent = 'No image selected';
  alert('Product uploaded successfully.');

  const productGrid = document.querySelector('.product-grid');
  if (productGrid) {
    productGrid.insertAdjacentHTML('afterbegin', buildProductCardHtml(result.data || result));
  }
}

const addProductForm = document.getElementById('addProductForm');
if (addProductForm) {
  addProductForm.addEventListener('submit', submitAddProduct);
}

const editProductForm = document.getElementById('editProductForm');
if (editProductForm) {
  editProductForm.addEventListener('submit', submitEditProduct);
}

document.getElementById('productImage')?.addEventListener('change', event => {
  const file = event.target.files?.[0];
  const preview = document.getElementById('productImagePreview');
  if (!preview) return;

  if (!file) {
    preview.textContent = 'No image selected';
    return;
  }

  if (!file.type.startsWith('image/')) {
    event.target.value = '';
    preview.textContent = 'Only image files are allowed';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    preview.innerHTML = `<img src="${reader.result}" alt="Product image preview">`;
  };
  reader.readAsDataURL(file);
});

// ── TODO ──────────────────────────────────────────────────
document.getElementById('addTodoBtn')?.addEventListener('click', () => {
  document.getElementById('addTodoModal').classList.add('open');
});

function addTodo() {
  const val = document.getElementById('newTodoInput').value.trim();
  if (!val) return;
  const li = document.createElement('div');
  li.className = 'todo-item pending-t';
  li.innerHTML = `<input type="checkbox" class="todo-cb"><span class="todo-text">${val}</span><i class='bx bx-dots-vertical-rounded todo-more'></i>`;
  li.querySelector('.todo-cb').addEventListener('change', function () {
    li.classList.toggle('done', this.checked);
    li.classList.toggle('pending-t', !this.checked);
    li.querySelector('.todo-text').style.textDecoration = this.checked ? 'line-through' : 'none';
    li.querySelector('.todo-text').style.color = this.checked ? 'var(--muted)' : 'var(--dark)';
  });
  document.getElementById('todoList').appendChild(li);
  document.getElementById('newTodoInput').value = '';
  document.getElementById('addTodoModal').classList.remove('open');
}

// existing checkboxes
document.querySelectorAll('.todo-cb').forEach(cb => {
  cb.addEventListener('change', function () {
    const item = this.closest('.todo-item');
    item.classList.toggle('done', this.checked);
    item.classList.toggle('pending-t', !this.checked);
  });
});

// ── CHAT ──────────────────────────────────────────────────
function sendMsg() {
  const inp = document.getElementById('chatInput');
  const val = inp.value.trim();
  if (!val) return;
  const body = document.querySelector('.msg-chat-body');
  const b = document.createElement('div');
  b.className = 'bubble sent';
  b.textContent = val;
  body.appendChild(b);
  body.scrollTop = body.scrollHeight;
  inp.value = '';
}
document.getElementById('chatInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });

// msg list item click
document.querySelectorAll('.msg-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.msg-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
  });
});

// ── CLOSE MODAL ON OVERLAY CLICK ──────────────────────────
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});

// ── SEARCH FUNCTIONALITY ─────────────────────────────────
document.getElementById('farmerSearchInput')?.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    document.querySelectorAll('.product-grid .product-card').forEach(card => {
      card.style.boxShadow = '';
      card.style.transform = '';
    });
    return;
  }

  let found = false;
  let firstMatch = null;

  document.querySelectorAll('.product-grid .product-card').forEach(card => {
    // Reset previous highlights
    card.style.boxShadow = '';
    card.style.transform = '';

    const title = card.querySelector('.product-name')?.textContent.toLowerCase() || '';
    if (title.includes(query)) {
      found = true;
      if (!firstMatch) firstMatch = card;
      // Highlight the matching card
      card.style.boxShadow = '0 0 15px 4px rgba(45, 106, 79, 0.4)';
      card.style.transform = 'scale(1.02)';
      card.style.transition = 'all 0.3s ease';
    }
  });

  if (found) {
    goTo('mystore');
    showFarmerToast('Product found!');
    if (firstMatch) {
      setTimeout(() => firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  } else {
    showFarmerToast('No product added / found with that name.');
  }
});

// ── TEAM MANAGEMENT ───────────────────────────────────────
async function loadTeamMembers() {
  const tableBody = document.getElementById('teamTableBody');
  if (!tableBody) return;

  try {
    const [teamRes, profileRes] = await Promise.all([
      apiRequest('/team'),
      apiRequest('/users/profile')
    ]);

    if (!teamRes.ok || !profileRes.ok) throw new Error('Failed to fetch data');

    const teamPayload = await teamRes.json();
    const profilePayload = await profileRes.json();

    const members = teamPayload.data || [];
    const owner = profilePayload.data || {};

    // Combine owner with team members
    const ownerEntry = {
      _id: 'owner',
      name: (owner.name || 'Farm Owner') + ' (You)',
      role: 'Farm Owner',
      phone: owner.phone || 'N/A',
      joinDate: owner.createdAt || new Date(),
      status: 'Active',
      isOwner: true
    };

    const allMembers = [ownerEntry, ...members];

    tableBody.innerHTML = allMembers.map(m => {
      const initials = m.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
      const joinDate = new Date(m.joinDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      const statusClass = m.status === 'Active' ? 'badge-active' : (m.status === 'On Leave' ? 'badge-onleave' : 'badge-inactive');

      return `
        <tr>
          <td><div class="user-cell"><div class="avatar-placeholder">${initials}</div>${m.name}</div></td>
          <td>${m.role}</td>
          <td>${m.phone}</td>
          <td>${joinDate}</td>
          <td><span class="badge-status ${statusClass}" data-i18n="sub_${m.status.toLowerCase().replace(' ', '_')}">${m.status}</span></td>
          <td style="display:flex;gap:6px;">
            ${!m.isOwner ? `
              <button class="btn-sm edit" style="flex:none;padding:5px 10px;" onclick="openAssignRole(this, '${m._id}', '${m.name}', '${m.role}')"><i class='bx bx-transfer'></i> <span data-i18n="lbl_role">Role</span></button>
              <button class="btn-sm del" style="flex:none;padding:5px 10px;" onclick="removeMember('${m._id}', '${m.name}')"><i class='bx bx-trash'></i></button>
            ` : `
              <button class="btn-sm edit" style="flex:none;padding:5px 10px;" onclick="goTo('profile')"><i class='bx bx-user'></i> <span data-i18n="nav_profile">Profile</span></button>
            `}
          </td>
        </tr>
      `;
    }).join('');
    if (typeof applyTranslations === 'function') applyTranslations(localStorage.getItem('agriLang') || 'en');

  } catch (err) {
    console.error('Team Load Error:', err);
    tableBody.innerHTML = '<tr><td colspan="6" style="padding:40px; text-align:center; color:#888;" data-i18n="state_failed_load">Error loading team members. Please refresh.</td></tr>';
    if (typeof applyTranslations === 'function') applyTranslations(localStorage.getItem('agriLang') || 'en');
  }
}

let assignRoleMemberId = null;
function openAssignRole(btn, memberId, memberName, currentRole) {
  assignRoleMemberId = memberId;
  document.getElementById('assignRoleMemberName').textContent = memberName;
  const sel = document.getElementById('assignRoleSelect');
  if (sel) sel.value = currentRole;
  document.getElementById('assignRoleModal')?.classList.add('open');
}

document.getElementById('confirmAssignRoleBtn')?.addEventListener('click', async () => {
  const newRole = document.getElementById('assignRoleSelect')?.value;
  if (!newRole || !assignRoleMemberId) return;

  try {
    const res = await apiRequest(`/team/${assignRoleMemberId}`, {
      method: 'PUT',
      body: { role: newRole }
    });
    if (res.ok) {
      showFarmerToast('Role updated successfully.');
      document.getElementById('assignRoleModal')?.classList.remove('open');
      loadTeamMembers();
    }
  } catch (err) {
    showFarmerToast('Error updating role.');
  }
});

function removeMember(memberId, memberName) {
  productToDelete = { id: memberId, el: null, isMember: true };
  const modal = document.getElementById('deleteConfirmModal');
  const heading = modal?.querySelector('h3');
  const msg = modal?.querySelector('p');
  if (heading) heading.textContent = "Remove " + memberName + "?";
  if (msg) msg.textContent = 'This will remove the member from your team. This cannot be undone.';
  modal?.classList.add('open');
}

// Add Member Form
document.getElementById('addMemberForm')?.addEventListener('submit', async function (e) {
  e.preventDefault();
  const name = document.getElementById('memberName').value.trim();
  const role = document.getElementById('memberRole').value;
  const phone = document.getElementById('memberPhone').value.trim();

  if (!name || !role || !phone) {
    showFarmerToast('Please fill all required fields.');
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Adding...';
  }

  try {
    const res = await apiRequest('/team', {
      method: 'POST',
      body: { name, role, phone }
    });

    if (res.ok) {
      showFarmerToast(name + ' added to the team!');
      document.getElementById('addMemberModal')?.classList.remove('open');
      document.getElementById('addMemberForm')?.reset();
      loadTeamMembers();
    } else {
      const errData = await res.json().catch(() => ({}));
      showFarmerToast('Error: ' + (errData.message || 'Failed to add member'));
    }
  } catch (err) {
    console.error('Add Member Error:', err);
    showFarmerToast('Network error while adding member.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Add Member';
    }
  }
});

// Restore delete modal text after use
document.getElementById('deleteConfirmModal')?.addEventListener('click', (e) => {
  const heading = document.querySelector('#deleteConfirmModal h3');
  const msg = document.querySelector('#deleteConfirmModal p');
  if (e.target.id === 'deleteConfirmModal') {
    if (heading) heading.textContent = 'Delete Product?';
    if (msg) msg.textContent = 'This action cannot be undone. Are you sure you want to remove this item from your store?';
    productToDelete = null;
  }
});

// ── NOTIFICATIONS — MARK ALL READ ─────────────────────────
document.getElementById('markAllReadBtn')?.addEventListener('click', async () => {
  try {
    const response = await apiRequest('/notifications/mark-all-read', { method: 'PUT' });
    if (!response.ok) {
      showFarmerToast('Failed to mark notifications as read.');
      return;
    }

    const list = document.getElementById('notifList');
    if (list) {
      const items = list.querySelectorAll('.notif-item');
      items.forEach((item, i) => {
        item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        item.style.transitionDelay = `${i * 30}ms`;
        item.style.opacity = '0';
        item.style.transform = 'translateX(20px)';
      });

      setTimeout(() => {
        list.innerHTML = `<div style="padding:40px; text-align:center; color:#888;">
          <i class='bx bx-bell-off' style="font-size:2rem; display:block; margin-bottom:10px;"></i>
          <span data-i18n="state_no_notif">No active notifications from your store.</span>
        </div>`;
        if (typeof applyTranslations === 'function') applyTranslations(localStorage.getItem('agriLang') || 'en');
        updateNotificationBadge();
        showFarmerToast('All notifications marked as read.');
      }, items.length > 0 ? (items.length * 30 + 350) : 100);
    }
  } catch (err) {
    console.error('Mark all read failed:', err);
    showFarmerToast('Error clearing notifications.');
  }
});

// ── PROFILE PAGE ──────────────────────────────────────────
const FARMER_PROFILE_KEY = 'agrifarmer_profile';

async function loadFarmerProfile() {
  const auth = getAuth();
  let dbProfile = {};

  try {
    const response = await apiRequest('/users/profile');
    if (response.ok) {
      const payload = await response.json();
      dbProfile = payload.data || {};
    }
  } catch (err) {
    console.warn('Could not fetch profile from DB:', err.message);
  }

  // Read-only: from auth token (or DB if synced)
  const name = dbProfile.name || auth?.user?.name || '';
  const email = dbProfile.email || auth?.user?.email || '';
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';

  // Hero banner
  const avatarEl = document.getElementById('profileAvatarHero');
  if (avatarEl) avatarEl.textContent = initials;
  const heroName = document.getElementById('profileHeroName');
  if (heroName) heroName.textContent = name || '—';
  const heroMeta = document.getElementById('profileHeroMeta');
  if (heroMeta) {
    const loc = dbProfile.location || 'AgriMart';
    heroMeta.textContent = `🌾 Farmer · ${loc}`;
  }

  // Update nav profile with real name
  const pnameEl = document.querySelector('.pname');
  if (pnameEl && name) pnameEl.textContent = name;

  // Personal info fields
  if (document.getElementById('profileName')) document.getElementById('profileName').value = name;
  if (document.getElementById('profileEmail')) document.getElementById('profileEmail').value = email;
  if (document.getElementById('profilePhone')) document.getElementById('profilePhone').value = dbProfile.phone || '';
  if (document.getElementById('profileLocation')) document.getElementById('profileLocation').value = dbProfile.location || '';

  // Farm details fields
  if (document.getElementById('profileFarmName')) document.getElementById('profileFarmName').value = dbProfile.farmName || '';
  if (document.getElementById('profileFarmSize')) document.getElementById('profileFarmSize').value = dbProfile.farmSize || '';
  if (document.getElementById('profileCrops')) document.getElementById('profileCrops').value = dbProfile.primaryCrops || '';
  if (document.getElementById('profileCertification')) document.getElementById('profileCertification').value = dbProfile.certification || '';
}


async function handleSavePersonalInfo() {
  console.log('Save Personal Info button clicked');
  const data = {
    phone: document.getElementById('profilePhone')?.value.trim() || '',
    location: document.getElementById('profileLocation')?.value.trim() || ''
  };
  console.log('Saving data:', data);

  try {
    const response = await apiRequest('/users/profile', {
      method: 'PUT',
      body: data
    });

    console.log('Response status:', response.status);
    if (response.ok) {
      const payload = await response.json();
      const updatedUser = payload.data || {};
      const heroMeta = document.getElementById('profileHeroMeta');
      if (heroMeta) heroMeta.textContent = '🌾 Farmer · ' + (updatedUser.location || 'AgriMart');
      showFarmerToast('Personal info saved to database!');
    } else {
      const errPayload = await response.json().catch(() => ({}));
      console.error('Update failed:', errPayload);
      showFarmerToast('Error: ' + (errPayload.message || 'Update failed'));
    }
  } catch (err) {
    console.error('Save error:', err);
    showFarmerToast('Failed to save info: ' + err.message);
  }
}



// Cancel Personal Info


async function handleSaveFarmDetails() {
  const data = {
    farmName: document.getElementById('profileFarmName')?.value.trim() || '',
    farmSize: document.getElementById('profileFarmSize')?.value.trim() || '',
    primaryCrops: document.getElementById('profileCrops')?.value.trim() || '',
    certification: document.getElementById('profileCertification')?.value.trim() || ''
  };

  try {
    const response = await apiRequest('/users/profile', {
      method: 'PUT',
      body: data
    });

    if (response.ok) {
      showFarmerToast('Farm details saved to database!');
    } else {
      const errPayload = await response.json().catch(() => ({}));
      showFarmerToast('Error: ' + (errPayload.message || 'Update failed'));
    }
  } catch (err) {
    showFarmerToast('Failed to save farm details: ' + err.message);
  }
}



// ── DARK MODE ─────────────────────────────────────────────
const darkToggle = document.getElementById('darkToggle');
darkToggle?.addEventListener('click', () => {
  darkToggle.classList.toggle('on');
  document.body.classList.toggle('dark');
});

// ── LOGOUT ────────────────────────────────────────
document.querySelector('.logout')?.addEventListener('click', function (e) {
  e.preventDefault();
  clearAuth();
  location.href = '../../login.html';
});

// responsive auto-collapse
if (window.innerWidth < 768) {
  document.getElementById('sidebar')?.classList.add('collapsed');
}
window.addEventListener('resize', () => {
  if (window.innerWidth < 768) {
    document.getElementById('sidebar')?.classList.add('collapsed');
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('Farmer.js initializing...');
    loadFarmerDashboardAnalytics();
    loadFarmerProducts();
    loadTeamMembers();
    await loadFarmerProfile();

    // Attach listeners after profile is loaded
    document.getElementById('savePersonalInfoBtn')?.addEventListener('click', handleSavePersonalInfo);
    document.getElementById('saveFarmDetailsBtn')?.addEventListener('click', handleSaveFarmDetails);
    document.getElementById('cancelPersonalInfoBtn')?.addEventListener('click', loadFarmerProfile);

    // Dashboard & Notifications init
    loadFarmerDashboardAnalytics();
    updateNotificationBadge();
    loadFarmerNotifications();

    setInterval(() => {
      loadFarmerDashboardAnalytics();
      updateNotificationBadge();
      loadFarmerNotifications();
    }, 30000); // 30s polling
    console.log('Farmer.js ready');
  } catch (err) {
    console.warn('Initialization issue:', err.message);
  }
});

// ── REAL-TIME NOTIFICATIONS ─────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

async function updateNotificationBadge() {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;

  try {
    const response = await apiRequest('/notifications');
    if (!response.ok) return;

    const result = await response.json();
    const unreadCount = (result.data || []).filter(n => !n.isRead).length;

    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  } catch (error) {
    console.error('Failed to update notification badge:', error);
  }
}

async function loadFarmerNotifications() {
  const notifList = document.getElementById('notifList');
  if (!notifList) return;

  try {
    const response = await apiRequest('/notifications');
    if (!response.ok) return;

    const result = await response.json();
    const notifications = result.data || [];

    if (notifications.length === 0) {
      notifList.innerHTML = `<div style="padding:40px; text-align:center; color:#888;">
        <i class='bx bx-bell-off' style="font-size:2rem; display:block; margin-bottom:10px;"></i>
        <span data-i18n="state_no_notif">No active notifications from your store.</span>
      </div>`;
    } else {
      notifList.innerHTML = notifications.map(n => `
        <div class="notif-item ${n.isRead ? '' : 'unread'}" onclick="markOneAsRead('${n._id}')">
          <div class="notif-dot" style="${n.isRead ? 'display:none;' : ''}"></div>
          <div style="flex:1;">
            <div class="notif-title">${n.title}</div>
            <div class="notif-desc">${n.message}</div>
            <div class="notif-time">${timeAgo(n.createdAt)}</div>
          </div>
        </div>
      `).join('');
    }
    if (typeof applyTranslations === 'function') applyTranslations(localStorage.getItem('agriLang') || 'en');
  } catch (error) {
    console.error('Failed to load notifications:', error);
  }
}

async function markOneAsRead(id) {
  try {
    const response = await apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
    if (response.ok) {
      updateNotificationBadge();
      loadFarmerNotifications();
    }
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
}
